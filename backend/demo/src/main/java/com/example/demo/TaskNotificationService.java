package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.Map;
import java.util.List;

@Service
public class TaskNotificationService {

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${brevo.api.url:}")
    private String brevoApiUrl;

    @Value("${spring.mail.username:tasktracker351@gmail.com}")
    private String senderEmail;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendTaskReminder(String to, String taskName, String timeIST) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            System.err.println("❌ BREVO_API_KEY is missing. Task reminder skipped.");
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            String textContent = "Hello!\n\nThis is an automated reminder for your task: " + taskName +
                    "\nScheduled Time: " + timeIST + " (IST)" +
                    "\n\nYour task starts in 30 minutes. Please be ready!";

            Map<String, Object> body = Map.of(
                    "sender", Map.of("email", senderEmail, "name", "APMS PRO"),
                    "to", List.of(Map.of("email", to)),
                    "subject", "APMS PRO: Important Task Alert!",
                    "textContent", textContent
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(brevoApiUrl, request, String.class);
            System.out.println("Reminder sent for task: " + taskName);

        } catch (Exception e) {
            System.err.println("Task Reminder Error: " + e.getMessage());
        }
    }
}

