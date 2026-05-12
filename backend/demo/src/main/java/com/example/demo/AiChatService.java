package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiChatService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final MilestoneRepository milestoneRepository;
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 1500L;

    public AiChatService(UserRepository userRepository, TaskRepository taskRepository, MilestoneRepository milestoneRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.milestoneRepository = milestoneRepository;
    }

    public String getChatResponse(String userId, String userMessage) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return "User not found. Cannot provide personalized advice.";
        }
        User user = userOpt.get();

        List<Task> tasks = taskRepository.findByUserId(userId);
        List<Task> pendingTasks = tasks.stream()
                .filter(task -> !isCompleted(task))
                .toList();

        String taskList = buildPendingTaskList(pendingTasks);

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a productivity mentor for an engineering student. ");
        prompt.append("Here are their pending tasks: ").append(taskList).append(". ");
        prompt.append("Give them a focused, specific 3-point action plan for today. ");
        prompt.append("Be direct and motivating. Max 80 words. ");
        prompt.append("Use Markdown bullet points. ");
        prompt.append("If the user's message adds extra context, incorporate it: ").append(userMessage);

        return callGeminiApi(prompt.toString());
    }

    private boolean isCompleted(Task task) {
        return task != null && "Completed".equalsIgnoreCase(task.getStatus());
    }

    private String buildPendingTaskList(List<Task> pendingTasks) {
        if (pendingTasks.isEmpty()) {
            return "No pending tasks right now";
        }

        StringJoiner joiner = new StringJoiner("; ");
        for (Task task : pendingTasks) {
            String title = task.getText() != null && !task.getText().isBlank() ? task.getText() : "Untitled task";
            String priority = task.getPriority() != null && !task.getPriority().isBlank() ? task.getPriority() : "Medium";
            String dueDate = task.getDueDate() != null && !task.getDueDate().isBlank() ? task.getDueDate() : "No deadline";
            joiner.add(title + " [Priority: " + priority + ", Deadline: " + dueDate + "]");
        }

        return joiner.toString();
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
