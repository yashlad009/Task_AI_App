package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    // Get last 50 messages for a user, ordered oldest first
    List<ChatMessage> findTop50ByUserIdOrderByCreatedAtAsc(String userId);

    // Count messages for a user
    long countByUserId(String userId);

    // Delete all messages for a user
    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage c WHERE c.userId = :userId")
    void deleteAllByUserId(String userId);
}
