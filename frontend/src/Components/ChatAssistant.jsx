import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './ChatAssistant.css';

const ChatAssistant = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Get current page info
  const getCurrentPageInfo = () => {
    const path = location.pathname;

    const pageMap = {
      '/dashboard': {
        name: 'Dashboard',
        greeting: "Hi! 📊 I can help you understand your inventory overview. Ask about low stock alerts or total inventory value.",
        suggestions: [
          { text: '⚠️ Show low stock alerts', query: 'What items are running low on stock?' },
          { text: '📈 Inventory summary', query: 'How many items are out of stock?' },
          { text: '🔍 Check item', query: 'Is Milk available?' }
        ]
      },
      '/inventory': {
        name: 'Inventory',
        greeting: "Welcome to Inventory! 📦 I can help you search items and check their stock levels across branches.",
        suggestions: [
          { text: '🔍 Search item', query: 'Check stock for Mouse' },
          { text: '📊 Stock status', query: 'Show all low stock items' },
          { text: '🏢 By branch', query: 'What items are in Main Branch?' }
        ]
      },
      '/lowstock': {
        name: 'Low Stock',
        greeting: "You're in Low Stock alerts! 🚨 I can help you find items that need restocking.",
        suggestions: [
          { text: '⚠️ Critical items', query: 'Show items in critical stock' },
          { text: '📋 Reorder list', query: 'Which items should I order?' },
          { text: '🏢 By branch', query: 'Low stock items in Secondary Branch' }
        ]
      },
      '/issue-note': {
        name: 'Issue Note',
        greeting: "Managing Issue Notes! 📋 I can help you check if items are available for issue.",
        suggestions: [
          { text: '✅ Check availability', query: 'Is Keyboard in stock?' },
          { text: '📦 Quick search', query: 'Can I issue Mouse?' },
          { text: '🔍 Find item', query: 'Stock status for Monitor' }
        ]
      },
      '/purchase-order': {
        name: 'Purchase Order',
        greeting: "Creating Purchase Orders! 🛒 I help you check what needs to be ordered.",
        suggestions: [
          { text: '⚠️ Items to order', query: 'Which items should I purchase?' },
          { text: '🔍 Check supplier', query: 'Check stock for ordering' },
          { text: '📊 Reorder levels', query: 'Show items below reorder level' }
        ]
      },
      '/good-received': {
        name: 'Good Received',
        greeting: "Recording received goods! 📥 I can help you check current stock and verify items.",
        suggestions: [
          { text: '✅ Verify item', query: 'Is this item in our system?' },
          { text: '📦 Check quantity', query: 'What was our last stock?' },
          { text: '🔍 Find item', query: 'Check item details' }
        ]
      },
      '/branches': {
        name: 'Branches',
        greeting: "Managing Branches! 🏢 I can help you check inventory across different branches.",
        suggestions: [
          { text: '🏢 Branch inventory', query: 'Show items in Main Branch' },
          { text: '📊 Compare branches', query: 'Which branch has most stock?' },
          { text: '🔍 Check item', query: 'Is Mouse available in all branches?' }
        ]
      },
      '/categories': {
        name: 'Categories',
        greeting: "Managing Categories! 📂 I can help you search items by category.",
        suggestions: [
          { text: '📂 By category', query: 'Show all Electronics' },
          { text: '🔍 Category items', query: 'What items are in Office Supplies?' },
          { text: '📊 Category stock', query: 'Check stock for Computer category' }
        ]
      },
      '/users': {
        name: 'Users',
        greeting: "Managing Users! 👥 I can help you with user information.",
        suggestions: [
          { text: '👤 User guide', query: 'How do I manage users?' },
          { text: '🔐 Roles info', query: 'What are the user roles?' },
          { text: '❓ Help', query: 'How do I add a new user?' }
        ]
      },
      '/reports': {
        name: 'Reports',
        greeting: "Viewing Reports! 📊 I can help you understand current inventory analytics.",
        suggestions: [
          { text: '📈 Inventory report', query: 'Show current inventory value' },
          { text: '📉 Trend analysis', query: 'What items are selling well?' },
          { text: '🔍 Stock movement', query: 'Show recent transactions' }
        ]
      }
    };

    return pageMap[path] || {
      name: 'Inventory System',
      greeting: "Hello! 👋 I'm your AI assistant for the CBBS Inventory System. Ask me about item availability!",
      suggestions: [
        { text: '🔍 Check item', query: 'Is Coffee available?' },
        { text: '📊 Stock status', query: 'Show low stock items' },
        { text: '⚠️ Alerts', query: 'What items need attention?' }
      ]
    };
  };

  // Initialize messages with page-specific greeting
  useEffect(() => {
    const pageInfo = getCurrentPageInfo();
    setMessages([
      {
        id: 1,
        text: pageInfo.greeting,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [location.pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call Node.js backend NLP service
      const response = await fetch('http://localhost:5000/api/chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: inputMessage })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: data.message,
          sender: 'ai',
          isHTML: true,
          intent: data.intent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorMsg = {
          id: Date.now() + 1,
          text: data.message || '❌ Error processing request',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }

    } catch (error) {
      console.error('Chat Error:', error);
      setIsTyping(false);

      const errorMsg = {
        id: Date.now() + 1,
        text: '⚠️ Chat service is not running. Make sure Node.js backend is running on port 5000.',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (query) => {
    setInputMessage(query);
    setTimeout(() => {
      document.querySelector('.message-input')?.focus();
    }, 0);
  };

  const pageInfo = getCurrentPageInfo();

  return (
    <>
      {/* Floating Chat Icon */}
      <div
        className={`chat-float-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={pageInfo.name}
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
                <h4>Stock Assistant</h4>
                <span className="status">{pageInfo.name}</span>
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
                  {message.isHTML ? (
                    <p dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>{message.text}</p>
                  )}
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
              {pageInfo.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="quick-btn"
                  onClick={() => handleQuickAction(suggestion.query)}
                  title={suggestion.query}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>

            <div className="chat-input">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about item availability..."
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
