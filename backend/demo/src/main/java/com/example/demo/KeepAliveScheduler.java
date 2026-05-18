package com.example.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Keeps the Render free-tier instance warm by self-pinging /healthz
 * every 10 minutes. Prevents the 30-50s cold-start delay for users.
 */
@Component
public class KeepAliveScheduler {

    @Value("${server.port:10000}")
    private String port;

    // Every 10 minutes
    @Scheduled(fixedRate = 600000)
    public void keepAlive() {
        try {
            RestTemplate rt = new RestTemplate();
            String url = "http://localhost:" + port + "/healthz";
            rt.getForObject(url, String.class);
            System.out.println("✅ [KeepAlive] Self-ping OK — server is warm.");
        } catch (Exception e) {
            // Silently ignore — this is best-effort only
        }
    }
}
