import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatAssistant = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
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
      const response = await fetch('http://localhost:5005/api/chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: inputMessage })
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
      handleSendMessage();
    }
  };

  const handleQuickAction = (query) => {
    setInputMessage(query);
    setTimeout(() => {
      document.querySelector('.message-input')?.focus();
    }, 0);
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
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
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
                placeholder={isListening ? "Listening... 🎙️" : "Ask about item availability..."}
                className="message-input"
              />
              {voiceSupported && (
                <button
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? handleStopListening : handleStartListening}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? '⏹️' : '🎤'}
                </button>
              )}
              {interimTranscript && (
                <span className="interim-text" style={{ marginRight: '8px' }}>{interimTranscript}</span>
              )}
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
