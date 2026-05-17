package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class AiChatService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final MilestoneRepository milestoneRepository;
    private final GamificationService gamificationService;
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 1500L;

    public AiChatService(UserRepository userRepository, TaskRepository taskRepository, 
                          MilestoneRepository milestoneRepository, GamificationService gamificationService) {

        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.milestoneRepository = milestoneRepository;
        this.gamificationService = gamificationService;

    }

    public String getChatResponse(String userId, String userMessage) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return "User not found. Cannot provide personalized advice.";
        }
        User user = userOpt.get();

        List<Task> allTasks = taskRepository.findByUserId(userId);
        List<Task> pendingTasks = allTasks.stream()
                .filter(task -> !isCompleted(task))
                .toList();

        // LIVE USER CONTEXT GATHERING
        String userName = user.getEmail().split("@")[0];
        String todayDate = LocalDate.now().toString();
        String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
        int streakCount = calculateStreak(allTasks);
        
        List<Task> dueTodayTasks = getTasksDueToday(pendingTasks);
        List<Task> overdueTasks = getOverdueTasks(pendingTasks);
        
        long completedToday = allTasks.stream()
                .filter(t -> isCompleted(t) && todayDate.equals(t.getCompletedAt()))
                .count();
        
        int weeklyRate = calculateWeeklyRate(allTasks);
        Map<String, Object> gamification = gamificationService.buildGamificationSummary(user);
        String milestoneSummary = String.format("Level %d, %d tokens, Next: %s", 
                gamification.get("level"), gamification.get("tokens"), 
                gamification.get("nextReward") != null ? ((Map)gamification.get("nextReward")).get("name") : "Maxed Out");
        
        Task topPriority = getTopPriorityTask(pendingTasks);
        String categoryBreakdown = getCategoryBreakdown(pendingTasks);

        StringBuilder context = new StringBuilder();
        context.append("━━━━━━━━━━━━━━━━━━━━━━━━\n");
        context.append("LIVE USER CONTEXT\n");
        context.append("━━━━━━━━━━━━━━━━━━━━━━━━\n");
        context.append("Name: ").append(userName).append("\n");
        context.append("Date: ").append(todayDate).append(" | Time: ").append(currentTime).append("\n");
        context.append("Current streak: ").append(streakCount).append(" days\n");
        context.append("Tasks due today: ").append(dueTodayTasks.size()).append("\n");
        context.append("Overdue tasks: ").append(overdueTasks.stream().map(Task::getText).collect(Collectors.joining(", "))).append("\n");
        context.append("Pending tasks (all): ").append(pendingTasks.stream().map(Task::getText).collect(Collectors.joining("; "))).append("\n");
        context.append("Completed today: ").append(completedToday).append("\n");
        context.append("Weekly completion rate: ").append(weeklyRate).append("%\n");
        context.append("Milestone progress: ").append(milestoneSummary).append("\n");
        context.append("Highest priority pending: ").append(topPriority != null ? topPriority.getText() : "None").append("\n");
        context.append("Category breakdown: ").append(categoryBreakdown).append("\n");
        context.append("Last active: ").append(LocalDateTime.now().toString()).append("\n\n");

        StringBuilder systemPrompt = new StringBuilder();
        systemPrompt.append("You are Task AI — the AI mentor embedded inside Task Tracker. You are a high-signal, no-fluff study and productivity coach.\n");
        systemPrompt.append(context);
        systemPrompt.append("YOUR IDENTITY AND TONE:\n");
        systemPrompt.append("- Sharp, direct, and real. No filler phrases.\n");
        systemPrompt.append("- Warm but firm. Celebrate wins, challenge without being harsh.\n");
        systemPrompt.append("- SHORT responses. Max 4–6 sentences unless a plan is requested.\n");
        systemPrompt.append("- Use the user's real data from the context above. Do not hallucinate.\n\n");
        systemPrompt.append("SITUATIONAL AWARENESS:\n");
        systemPrompt.append("1. Is the streak at risk? (No completed today + late hour)\n");
        systemPrompt.append("2. Are there overdue tasks? Reference them by name.\n");
        systemPrompt.append("3. Push for milestone completion if close.\n\n");
        systemPrompt.append("User's Query: ").append(userMessage);

        return callGeminiApi(systemPrompt.toString());
    }

    private boolean isCompleted(Task task) {
        return task != null && "Completed".equalsIgnoreCase(task.getStatus());
    }

    private int calculateStreak(List<Task> allTasks) {
        Set<LocalDate> completionDates = allTasks.stream()
                .filter(this::isCompleted)
                .map(t -> {
                    try { return LocalDate.parse(t.getCompletedAt()); } 
                    catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (completionDates.isEmpty()) return 0;

        int streak = 0;
        LocalDate cursor = LocalDate.now();
        
        // If nothing completed today, check if yesterday was completed to keep streak alive
        if (!completionDates.contains(cursor)) {
            cursor = cursor.minusDays(1);
        }

        while (completionDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private int calculateWeeklyRate(List<Task> allTasks) {
        LocalDate weekAgo = LocalDate.now().minusDays(7);
        long relevantTotal = allTasks.size();
        if (relevantTotal == 0) return 0;
        
        long completedInLastWeek = allTasks.stream()
                .filter(this::isCompleted)
                .filter(t -> {
                    try {
                        return LocalDate.parse(t.getCompletedAt()).isAfter(weekAgo.minusDays(1));
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();
        
        return (int) ((completedInLastWeek * 100) / relevantTotal);
    }

    private List<Task> getTasksDueToday(List<Task> pendingTasks) {
        String today = LocalDate.now().toString();
        return pendingTasks.stream()
                .filter(t -> today.equals(t.getDueDate()))
                .toList();
    }

    private List<Task> getOverdueTasks(List<Task> pendingTasks) {
        LocalDate today = LocalDate.now();
        return pendingTasks.stream()
                .filter(t -> {
                    try {
                        return t.getDueDate() != null && LocalDate.parse(t.getDueDate()).isBefore(today);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .toList();
    }

    private Task getTopPriorityTask(List<Task> pendingTasks) {
        return pendingTasks.stream()
                .min(Comparator.comparingInt(t -> {
                    String p = t.getPriority().toLowerCase();
                    if (p.equals("high")) return 0;
                    if (p.equals("medium")) return 1;
                    return 2;
                }))
                .orElse(null);
    }

    private String getCategoryBreakdown(List<Task> pendingTasks) {
        Map<String, Long> counts = pendingTasks.stream()
                .collect(Collectors.groupingBy(Task::getCategory, Collectors.counting()));
        return counts.entrySet().stream()
                .map(e -> e.getKey() + ": " + e.getValue())
                .collect(Collectors.joining(", "));
    }


    private String callGeminiApi(String prompt) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "AI Mentor is not configured. Set GEMINI_API_KEY in the environment and restart the backend.";
        }

        RestTemplate restTemplate = new RestTemplate();
        String url = geminiApiUrl + "?key=" + geminiApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Build the request body based on Gemini API spec
        Map<String, Object> requestBody = new HashMap<>();
        
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> contentPart = new HashMap<>();
        List<Map<String, Object>> partsList = new ArrayList<>();
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);
        partsList.add(textPart);
        contentPart.put("parts", partsList);
        contents.add(contentPart);
        
        requestBody.put("contents", contents);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map<String, Object> body = response.getBody();
                    if (body.containsKey("candidates")) {
                        List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                        if (!candidates.isEmpty()) {
                            Map<String, Object> firstCandidate = candidates.get(0);
                            if (firstCandidate.containsKey("content")) {
                                Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                                if (content.containsKey("parts")) {
                                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                                    if (!parts.isEmpty() && parts.get(0).containsKey("text")) {
                                        return (String) parts.get(0).get("text");
                                    }
                                }
                            }
                        }
                    }
                }
                return "I'm sorry, I couldn't process your request right now. Please try again later.";
            } catch (org.springframework.web.client.ResourceAccessException e) {
                System.err.println("Connection timeout or network error with AI Mentor: " + e.getMessage());
                return "The AI Mentor is currently taking too long to respond. Please try again later.";
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                if (e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE && attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS * attempt);
                    } catch (InterruptedException interruptedException) {
                        Thread.currentThread().interrupt();
                        return "The AI Mentor retry was interrupted. Please try again.";
                    }
                    continue;
                }

                System.err.println("HTTP Error from Gemini API: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
                if (e.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
                    return "AI Mentor is busy right now because the Gemini model is under high demand. Please try again in a moment.";
                }
                return "AI Mentor Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString();
            } catch (Exception e) {
                e.printStackTrace();
                return "An unexpected error occurred (" + e.getClass().getSimpleName() + "): " + e.getMessage();
            }
        }

        return "AI Mentor is busy right now because the Gemini model is under high demand. Please try again in a moment.";
    }
}
