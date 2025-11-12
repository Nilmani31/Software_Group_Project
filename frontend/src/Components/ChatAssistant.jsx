import React, { useState, useRef, useEffect } from 'react';
import './ChatAssistant.css';

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant for the CBBS Inventory System. How can I help you today?",
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response (you can replace this with actual AI API call)
    setTimeout(() => {
      const aiResponses = [
        "I can help you with inventory management, stock levels, and generating reports.",
        "Would you like me to explain any specific feature of the inventory system?",
        "I can assist with purchase orders, stock tracking, and low stock alerts.",
        "Let me know if you need help navigating the dashboard or understanding the reports.",
        "I'm here to help with any questions about the CBBS Inventory System features."
      ];
      
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      
      const aiMessage = {
        id: Date.now() + 1,
        text: randomResponse,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <div 
        className={`chat-float-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '💬'}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="ai-avatar">🤖</div>
              <div>
                <h4>AI Assistant</h4>
                <span className="status">Online</span>
              </div>
            </div>
            <button 
              className="minimize-btn"
              onClick={() => setIsOpen(false)}
            >
              _
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="timestamp">{message.timestamp}</span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message ai typing">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <div className="quick-actions">
              <button 
                className="quick-btn"
                onClick={() => setInputMessage("How do I check low stock items?")}
              >
                📊 Low Stock
              </button>
              <button 
                className="quick-btn"
                onClick={() => setInputMessage("How do I generate reports?")}
              >
                📋 Reports
              </button>
            </div>
            
            <div className="chat-input">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="message-input"
              />
              <button 
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
              >
                🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;