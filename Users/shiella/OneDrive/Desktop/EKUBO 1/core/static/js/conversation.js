// Wait for the DOM to be fully loaded before running any script
document.addEventListener('DOMContentLoaded', function() {
    // Get the current user's UUID from a hidden input in the HTML template.
    const currentUserUuid = document.getElementById('current-user-uuid').value;
    const chatContainer = document.getElementById('chat-container');
    const messageForm = document.querySelector('.message-form');
    const messageTextarea = document.querySelector('textarea[name="content"]');
    
    // Real-time sidebar search
    const searchInput = document.querySelector('input[name="search_user"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            const sidebarItems = document.querySelectorAll('.sidebar ul li');
            
            sidebarItems.forEach(item => {
                const link = item.querySelector('a');
                if (link) {
                    // Extract user info from the sidebar item
                    const nameEl = link.querySelector('h5');
                    const shopEl = link.querySelector('h6');
                    const userName = nameEl ? nameEl.textContent.toLowerCase() : '';
                    const shopName = shopEl ? shopEl.textContent.toLowerCase() : '';
                    
                    // Show item if it matches the search query (or if query is empty)
                    if (!query || userName.includes(query) || shopName.includes(query)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                }
            });
        });
    }

    // Get receiver ID from the chat container's data attribute
    const receiverId = chatContainer ? chatContainer.getAttribute('data-current-user-id') : null;

    // Check if the UUID is available before attempting to create the WebSocket.
    if (!currentUserUuid) {
        console.error("User UUID not found. WebSocket connection cannot be established.");
        return;
    }

    // Get profile images from hidden inputs (may be empty)
    const senderProfileImage = document.getElementById('sender-profile-image').value || '';
    const receiverProfileImage = document.getElementById('receiver-profile-image').value || '';

    // Function to scroll to bottom instantly (no animation)
    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // Scroll to bottom on page load to show latest messages
    scrollToBottom();

    // Construct the WebSocket URL with the UUID
    const chatSocket = new WebSocket(
        (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host +
        '/ws/chat/' + currentUserUuid + '/'
    );

    // Prevent default form submission and handle with WebSocket instead
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendMessage();
        });
        // Attach click handler to the send button (button is type="button")
        const sendBtn = messageForm.querySelector('button[type="button"]');
        if (sendBtn) {
            sendBtn.addEventListener('click', function(e) {
                e.preventDefault();
                sendMessage();
            });
        }
    }

    // Also allow Enter key to send messages
    if (messageTextarea) {
        messageTextarea.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-grow textarea - expand up to 3 rows (max-height: 120px)
        messageTextarea.addEventListener('input', function() {
            // Reset height to auto to get the correct scrollHeight
            this.style.height = 'auto';
            // Set height to scrollHeight, capped at 120px (3 rows)
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    // Function to send a message via WebSocket
    function sendMessage() {
        const message = messageTextarea.value.trim();
        
        if (message && receiverId) {
            chatSocket.send(JSON.stringify({
                'message': message,
                'receiver_id': receiverId
            }));
            messageTextarea.value = ''; // Clear the input field after sending
            messageTextarea.style.height = 'auto'; // Reset textarea height back to 1 row
            
            // Scroll to bottom instantly without animation
            scrollToBottom();
        }
    }

    // Function to format timestamp
    function formatTimestamp() {
        const now = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' };
        return now.toLocaleDateString('en-US', options);
    }

    // Function to display a message in the chat window
    function displayMessage(messageText, senderId, isCurrentUser, timestamp) {
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'one-message';

        const dateP = document.createElement('p');
        dateP.className = 'text-center date';
        // Use server timestamp if provided, otherwise fallback to client time
        if (timestamp) {
            try {
                const t = new Date(timestamp);
                dateP.textContent = t.toLocaleString();
            } catch (err) {
                dateP.textContent = formatTimestamp();
            }
        } else {
            dateP.textContent = formatTimestamp();
        }

        const chatMessageDiv = document.createElement('div');
        if (isCurrentUser) {
            chatMessageDiv.className = 'chat-message-sender mb-3';
            chatMessageDiv.style.marginBottom = '5px';
        } else {
            chatMessageDiv.className = 'chat-message-receiver mb-3';
        }

        const img = document.createElement('img');
        img.src = isCurrentUser ? senderProfileImage : receiverProfileImage;
        img.alt = 'Profile Picture';
        img.style.borderRadius = '50%';
        img.style.width = '40px';
        img.style.height = '40px';

        const span = document.createElement('span');
        span.className = isCurrentUser ? 'chat-sender' : 'chat-receiver';
        span.style.backgroundColor = isCurrentUser ? '#c4c4c4' : '#c4c4c4';
        span.style.paddingTop = '2px';
        span.style.paddingBottom = '3px';
        span.style.paddingLeft = '10px';
        span.style.paddingRight = '10px';
        span.style.borderRadius = '20px';
        span.textContent = messageText;

        if (isCurrentUser) {
            chatMessageDiv.appendChild(span);
            chatMessageDiv.appendChild(img);
        } else {
            chatMessageDiv.appendChild(img);
            chatMessageDiv.appendChild(span);
        }

        messageDiv.appendChild(dateP);
        messageDiv.appendChild(chatMessageDiv);

        chatContainer.appendChild(messageDiv);

        // Auto-scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Function to update the sidebar last message for a user
    function updateSidebarMessage(userId, messageText) {
        // Find the sidebar link for this user
        const userLinks = document.querySelectorAll('.sidebar ul li a');
        
        userLinks.forEach(link => {
            // Extract user ID from href (last part of the URL)
            const href = link.getAttribute('href');
            if (href && href.includes(userId)) {
                // Find the last-message div within this link
                const lastMessageDiv = link.querySelector('.last-message');
                if (lastMessageDiv) {
                    // Truncate message to 15 chars and add ellipsis if needed
                    const truncated = messageText.length > 15 ? messageText.slice(0, 15) + '...' : messageText;
                    
                    // Update or create the span with the message
                    let span = lastMessageDiv.querySelector('span');
                    if (!span) {
                        span = document.createElement('span');
                        lastMessageDiv.innerHTML = '';
                        lastMessageDiv.appendChild(span);
                    }
                    span.textContent = truncated;
                    span.className = 'text-secondary';
                }
            }
        });
    }

    // Create and prepend a sidebar user entry if missing. If present, update its last message and move it to top.
    function addSidebarUser(user) {
        // Avoid duplicates
        const userLinks = document.querySelectorAll('.sidebar ul li a');
        for (let link of userLinks) {
            const href = link.getAttribute('href');
            if (href && href.includes(user.id)) {
                // Update last message and move to top
                updateSidebarMessage(user.id, user.last_message || '');
                const li = link.closest('li');
                const ul = document.querySelector('.sidebar ul');
                if (li && ul && ul.firstChild !== li) {
                    ul.insertBefore(li, ul.firstChild);
                }
                return;
            }
        }

        // Build a new <li> element matching the template structure
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.setAttribute('href', user.conversation_url || '#');

        const img = document.createElement('img');
        img.setAttribute('width', '50');
        img.setAttribute('height', '50');
        img.setAttribute('src', user.profile_url || '');
        img.setAttribute('alt', 'Profile Picture');

        const div = document.createElement('div');
        div.style.flex = '1';

        const h5 = document.createElement('h5');
        h5.innerHTML = '<b>' + (user.first_name || '') + ' ' + (user.last_name || '') + '</b>';

        const lastDiv = document.createElement('div');
        lastDiv.className = 'last-message';
        const lastSpan = document.createElement('span');
        lastSpan.className = 'text-secondary';
        const truncated = user.last_message && user.last_message.length > 15 ? user.last_message.slice(0,15) + '...' : (user.last_message || '');
        lastSpan.textContent = truncated;
        lastDiv.appendChild(lastSpan);

        div.appendChild(h5);
        div.appendChild(lastDiv);

        a.appendChild(img);
        a.appendChild(div);
        li.appendChild(a);

        const ul = document.querySelector('.sidebar ul');
        if (ul) {
            ul.insertBefore(li, ul.firstChild);
        }
    }

    // Add event listener for incoming messages from the WebSocket
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);

        // Handle special server event types first
        if (data.type === 'new_conversation' && data.user) {
            addSidebarUser(data.user);
            return;
        }

        const message = data.message;
        const senderId = data.sender_id;
        const timestamp = data.timestamp;

        // Determine if the message is from the current user
        const isCurrentUser = senderId === currentUserUuid;

        // Display the message in the chat container (uses server timestamp if present)
        displayMessage(message, senderId, isCurrentUser, timestamp);

        // Scroll to bottom instantly to show the latest message
        scrollToBottom();

        // Update the sidebar last message for the currently selected user
        // If the message is from current user, update receiver's sidebar
        // If the message is from another user, update their sidebar
        const userToUpdate = isCurrentUser ? receiverId : senderId;
        if (userToUpdate) {
            updateSidebarMessage(userToUpdate, message);
        }
    };

    // Add event listener for when the WebSocket connection is closed
    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    // Add event listener for WebSocket errors
    chatSocket.onerror = function(e) {
        console.error('WebSocket error:', e);
    };

    // Add event listener for when the WebSocket connection is opened
    chatSocket.onopen = function(e) {
        console.log('WebSocket connection established successfully.');
    };
});
