import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAuthHeaders } from '../utils/authHeaders';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Mic,
  Square,
  Maximize2,
  Minimize2
} from 'lucide-react';

const ChatAssistant = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const messagesEndRef = useRef(null);
  const voiceRecognitionRef = useRef(null);

  // Get current page info
  const getCurrentPageInfo = () => {
    return {
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

  // Initialize Web Speech API for voice input
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setInputMessage(prev => prev + transcript);
          } else {
            interim += transcript;
          }
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      voiceRecognitionRef.current = recognition;
    }

    return () => {
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.abort();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (customMessage = null) => {
    const rawText = typeof customMessage === 'string' ? customMessage : inputMessage;
    if (!rawText || !rawText.trim() || isTyping) return;

    const messageText = rawText.trim();
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:5005/api/chat/send-message', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userMessage: messageText })
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        setIsTyping(false);
        
        const messageId = Date.now() + 1;
        setMessages(prev => [...prev, {
            id: messageId,
            text: '',
            sender: 'ai',
            isHTML: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let buffer = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            
            if (value) {
                buffer += decoder.decode(value, { stream: true });
                const blocks = buffer.split('\n\n');
                buffer = blocks.pop(); // Keep incomplete block in buffer
                
                for (const block of blocks) {
                    const lines = block.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === '[DONE]') {
                                done = true;
                                break;
                            }
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'meta') {
                                    // optional: set intent metadata
                                } else if (data.type === 'chunk') {
                                    setMessages(prev => prev.map(msg => {
                                        if (msg.id === messageId) {
                                            return { ...msg, text: msg.text + data.text };
                                        }
                                        return msg;
                                    }));
                                } else if (data.type === 'error') {
                                    setMessages(prev => prev.map(msg => {
                                        if (msg.id === messageId) {
                                            return { ...msg, text: msg.text + '\n❌ ' + data.message };
                                        }
                                        return msg;
                                    }));
                                }
                            } catch (e) {
                                console.error('Error parsing stream chunk', e);
                            }
                        }
                    }
                }
            }
        }
      } else {
        // Fallback for standard JSON responses
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
      }

    } catch (error) {
      console.error('Chat Error:', error);
      setIsTyping(false);

      const errorMsg = {
        id: Date.now() + 1,
        text: '⚠️ Chat service error. Make sure Node.js backend is running on port 5005.',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping && inputMessage.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleQuickAction = (query) => {
    if (isTyping) return;
    handleSendMessage(query);
  };

  const handleStartListening = () => {
    if (voiceRecognitionRef.current && !isListening) {
      voiceRecognitionRef.current.start();
    }
  };

  const handleStopListening = () => {
    if (voiceRecognitionRef.current && isListening) {
      voiceRecognitionRef.current.stop();
    }
  };

  const pageInfo = getCurrentPageInfo();

  return (
    <>
      {/* Floating AI Assistant Trigger Icon (Right Bottom) */}
      <button
        type="button"
        className={`ai-assistant-float-btn ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
        title="Open AI Inventory Assistant"
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.5} />
        ) : (
          <div className="ai-icon-content">
            <Bot size={26} strokeWidth={2.2} className="ai-icon-bot" />
            <Sparkles size={13} className="ai-icon-sparkle" />
            <span className="ai-online-indicator" title="AI Assistant Online" />
          </div>
        )}
      </button>

      {/* AI Assistant Chat Panel */}
      {isOpen && (
        <div className={`ai-assistant-panel ${isExpanded ? 'is-expanded' : ''}`}>
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-header-brand">
              <div className="ai-header-avatar">
                <Bot size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="ai-header-title">AI Inventory Assistant</h4>
                <div className="ai-header-status">
                  <span className="ai-status-dot" />
                  <span>{pageInfo.name} • Active</span>
                </div>
              </div>
            </div>
            <div className="ai-header-actions">
              <button
                type="button"
                className="ai-header-action-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Standard chat width" : "Widen chat window"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                className="ai-header-close-btn"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="ai-suggestions-row">
            {pageInfo.suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className={`ai-suggestion-chip ${isTyping ? 'disabled' : ''}`}
                onClick={() => handleQuickAction(suggestion.query)}
                disabled={isTyping}
                title={suggestion.query}
              >
                {suggestion.text}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="ai-messages-scroll">
            {messages.map((message) => (
              <div key={message.id} className={`ai-msg ${message.sender}`}>
                <div className="ai-msg-bubble">
                  {message.isHTML ? (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>{message.text}</p>
                  )}
                </div>
                <span className="ai-msg-time">{message.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="ai-msg ai">
                <div className="ai-msg-bubble">
                  <div className="ai-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="ai-input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
              placeholder={isListening ? "Listening... Speak now..." : isTyping ? "AI is generating an answer..." : "Ask about stock, items, availability..."}
              className="ai-input-field"
            />
            {voiceSupported && (
              <button
                type="button"
                className={`ai-action-btn ${isListening ? 'active' : ''}`}
                onClick={isListening ? handleStopListening : handleStartListening}
                disabled={isTyping}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <Square size={16} /> : <Mic size={16} />}
              </button>
            )}
            {interimTranscript && (
              <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {interimTranscript}
              </span>
            )}
            <button
              type="button"
              className="ai-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
