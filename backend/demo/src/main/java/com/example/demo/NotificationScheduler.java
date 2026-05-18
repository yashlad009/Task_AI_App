package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class NotificationScheduler {

    @Autowired
    private ImportantTaskRepository repository;

    @Autowired
    private TaskNotificationService notificationService;

    // This constructor runs the moment Spring Boot starts
    public NotificationScheduler() {
        System.out.println("🚀 [SYSTEM] Notification Scheduler has been Initialized!");
    }

    @Scheduled(fixedRate = 30000) // Runs every 30 seconds
    public void checkAndNotify() {
        // Current time in IST (India Standard Time) — tasks are stored in IST
        LocalDateTime nowIST = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));

        // Fire reminder when task is between 25 and 35 minutes away (±5 min window)
        LocalDateTime windowStart = nowIST.plusMinutes(25);
        LocalDateTime windowEnd   = nowIST.plusMinutes(35);

        System.out.println("⏰ [CLOCK] IST now: " + nowIST.format(DateTimeFormatter.ofPattern("HH:mm:ss"))
                + " | Window: " + windowStart.format(DateTimeFormatter.ofPattern("HH:mm"))
                + " – " + windowEnd.format(DateTimeFormatter.ofPattern("HH:mm")));

        List<ImportantTask> tasks = repository.findByProcessedFalse();

        if (tasks.isEmpty()) {
            System.out.println("ℹ️ No pending important tasks found in DB.");
        }

        for (ImportantTask task : tasks) {
            LocalDateTime taskTime = task.getEventTime(); // stored as IST local time

            System.out.println("🔍 Checking Task: " + task.getTaskName() + " | Time: " + taskTime);

            if (taskTime.isAfter(windowStart) && taskTime.isBefore(windowEnd)) {
                try {
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("hh:mm a");
                    String formattedTime = taskTime.format(formatter);

                    System.out.println("🎯 MATCH! Triggering alert for: " + task.getTaskName());

                    notificationService.sendTaskReminder(
                            task.getUserEmail(),
                            task.getTaskName(),
                            formattedTime
                    );

                    task.setProcessed(true);
                    repository.save(task);
                    System.out.println("✅ SUCCESS: Task marked as processed.");

                } catch (Exception e) {
                    System.err.println("❌ MAIL ERROR: " + e.getMessage());
                }
            } else {
                System.out.println("⏩ Task '" + task.getTaskName() + "' not in 30-min window yet.");
            }
        }
    }
}