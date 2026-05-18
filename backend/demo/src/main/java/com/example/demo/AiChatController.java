package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiChatController {

    private final AiChatService aiChatService;
    private final ChatMessageRepository chatMessageRepository;

    public AiChatController(AiChatService aiChatService, ChatMessageRepository chatMessageRepository) {
        this.aiChatService = aiChatService;
        this.chatMessageRepository = chatMessageRepository;
    }

    // Send a message and get AI response — saves both to DB
    @PostMapping("/chat/{userId}")
    public ResponseEntity<AiChatResponse> chat(
            @PathVariable String userId,
            @RequestBody AiChatRequest request) {

        // Save user message
        chatMessageRepository.save(new ChatMessage(userId, "user", request.getMessage()));

        // Get AI response
        String aiResponseText = aiChatService.getChatResponse(userId, request.getMessage());

        // Save AI response
        chatMessageRepository.save(new ChatMessage(userId, "ai", aiResponseText));

        return ResponseEntity.ok(new AiChatResponse(aiResponseText));
    }

    // Get chat history for a user (last 50 messages)
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<ChatMessage>> getHistory(@PathVariable String userId) {
        List<ChatMessage> history = chatMessageRepository.findTop50ByUserIdOrderByCreatedAtAsc(userId);
        return ResponseEntity.ok(history);
    }

    // Clear chat history for a user
    @DeleteMapping("/history/{userId}")
    public ResponseEntity<Map<String, String>> clearHistory(@PathVariable String userId) {
        chatMessageRepository.deleteAllByUserId(userId);
        return ResponseEntity.ok(Map.of("message", "Chat history cleared"));
    }
}
