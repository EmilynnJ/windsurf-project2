import { useState } from 'react';

export function MessagingPage() {
  const [conversations] = useState([
    {
      id: 1,
      name: 'Luna Starweaver',
      avatar: '🌟',
      lastMessage: 'Your reading is scheduled for tomorrow at 2 PM',
      lastMessageTime: '10:30 AM',
      unreadCount: 0,
      isOnline: true
    },
    {
      id: 2,
      name: 'Phoenix Mystique',
      avatar: '🔮',
      lastMessage: 'Thank you for the wonderful session yesterday!',
      lastMessageTime: 'Yesterday',
      unreadCount: 2,
      isOnline: false
    },
    {
      id: 3,
      name: 'Oracle Moonchild',
      avatar: '🌙',
      lastMessage: 'I have availability this weekend',
      lastMessageTime: 'Mar 10',
      unreadCount: 0,
      isOnline: true
    },
    {
      id: 4,
      name: 'Cosmic Sage',
      avatar: '⭐',
      lastMessage: 'Looking forward to our session',
      lastMessageTime: 'Mar 8',
      unreadCount: 0,
      isOnline: false
    }
  ]);

  const [activeConversation, setActiveConversation] = useState(1);
  const [message, setMessage] = useState('');
  const [messages] = useState([
    { id: 1, sender: 'them', text: 'Hello! How can I help you today?', timestamp: '10:30 AM', read: true },
    { id: 2, sender: 'me', text: 'Hi, I wanted to schedule a reading', timestamp: '10:31 AM', read: true },
    { id: 3, sender: 'them', text: 'Absolutely! What day works best for you?', timestamp: '10:32 AM', read: true },
    { id: 4, sender: 'me', text: 'Tomorrow afternoon would be perfect', timestamp: '10:33 AM', read: true },
    { id: 5, sender: 'them', text: 'I have availability at 2 PM. Does that work?', timestamp: '10:34 AM', read: true },
    { id: 6, sender: 'me', text: 'Yes, that works great!', timestamp: '10:35 AM', read: true }
  ]);

  const sendMessage = () => {
    if (message.trim()) {
      setMessage('');
    }
  };

  const activeConv = conversations.find(c => c.id === activeConversation);

  return (
    <div className="messaging-page" style={{
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
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>Messages</h1>
        
        <div className="card" style={{ 
          flex: 1, 
          display: 'flex', 
          overflow: 'hidden',
          borderRadius: 'var(--border-radius)'
        }}>
          {/* Conversations List */}
          <div style={{ 
            width: '300px', 
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Conversations</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  style={{ 
                    padding: '1rem',
                    cursor: 'pointer',
                    backgroundColor: activeConversation === conv.id ? 'rgba(107, 70, 193, 0.2)' : 'transparent',
                    borderLeft: activeConversation === conv.id ? '3px solid var(--primary-purple)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: '2rem' }}>{conv.avatar}</div>
                    {conv.isOnline && (
                      <div style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        right: 0, 
                        width: '10px', 
                        height: '10px', 
                        backgroundColor: '#10B981', 
                        borderRadius: '50%', 
                        border: '2px solid var(--card-bg)'
                      }}></div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: '600' }}>{conv.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{conv.lastMessageTime}</div>
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: 'var(--text-muted)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      marginTop: '0.25rem'
                    }}>
                      {conv.lastMessage}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div style={{ 
                        backgroundColor: 'var(--primary-purple)', 
                        color: 'white', 
                        borderRadius: '12px', 
                        padding: '0.125rem 0.5rem', 
                        fontSize: '0.75rem',
                        display: 'inline-block',
                        marginTop: '0.25rem'
                      }}>
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Chat Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>{activeConv.avatar}</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{activeConv.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {activeConv.isOnline ? 'Online now' : 'Offline'}
                    </div>
                  </div>
                </div>
                
                {/* Messages Area */}
                <div style={{ 
                  flex: 1, 
                  padding: '1rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {messages.map(msg => (
                    <div 
                      key={msg.id} 
                      style={{ 
                        alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        backgroundColor: msg.sender === 'me' ? 'var(--primary-purple)' : 'rgba(255, 255, 255, 0.1)',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div style={{ color: msg.sender === 'me' ? 'white' : 'inherit' }}>
                        {msg.text}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: msg.sender === 'me' ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
                        textAlign: msg.sender === 'me' ? 'right' : 'left',
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
              </>
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✉️</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Select a conversation</h3>
                <p style={{ color: 'var(--text-muted)' }}>Choose a conversation from the list to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}