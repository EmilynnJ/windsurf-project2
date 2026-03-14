import { useState } from 'react';

export function ReadingSessionPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'video'>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'reader', text: 'Welcome to your reading session! How can I assist you today?', timestamp: '10:30 AM' },
    { id: 2, sender: 'client', text: 'I\'m seeking guidance about my career path.', timestamp: '10:31 AM' },
    { id: 3, sender: 'reader', text: 'I sense opportunities coming your way. Let me shuffle the cards...', timestamp: '10:32 AM' }
  ]);

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        { 
          id: messages.length + 1, 
          sender: 'client', 
          text: message, 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }
      ]);
      setMessage('');
    }
  };

  return (
    <div className="reading-session-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '1rem 0',
      height: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="container" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Session Header */}
        <div className="card" style={{ 
          padding: '1rem', 
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>🔮</div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Reading Session with Luna Starweaver</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>Tarot & Spirituality • Started 10:30 AM</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('chat')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Chat
            </button>
            <button 
              className={`btn ${activeTab === 'voice' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('voice')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Voice
            </button>
            <button 
              className={`btn ${activeTab === 'video' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('video')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Video
            </button>
          </div>
        </div>

        {/* Session Content */}
        <div className="card" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Messages Area */}
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    style={{ 
                      alignSelf: msg.sender === 'client' ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      backgroundColor: msg.sender === 'client' ? 'var(--primary-purple)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ color: msg.sender === 'client' ? 'white' : 'inherit' }}>
                      {msg.text}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: msg.sender === 'client' ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
                      textAlign: 'right',
                      marginTop: '0.25rem'
                    }}>
                      {msg.timestamp}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div style={{ 
                padding: '1rem', 
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(30, 30, 46, 0.5)',
                    color: 'white'
                  }}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={sendMessage}
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Voice/Video Tab Placeholders */}
          {(activeTab === 'voice' || activeTab === 'video') && (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {activeTab === 'voice' ? '🎤' : '📹'}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                {activeTab === 'voice' ? 'Voice Call' : 'Video Call'} Session
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                {activeTab === 'voice' 
                  ? 'Engage in a voice conversation with your psychic reader' 
                  : 'Connect face-to-face with your psychic reader for a more personal experience'}
              </p>
              <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                {activeTab === 'voice' ? 'Start Voice Call' : 'Start Video Call'}
              </button>
            </div>
          )}
        </div>

        {/* Session Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          marginTop: '1rem' 
        }}>
          <button className="btn btn-outline" style={{ padding: '0.75rem 2rem' }}>
            End Session
          </button>
          <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Extend Session (+30 mins)
          </button>
        </div>
      </div>
    </div>
  );
}