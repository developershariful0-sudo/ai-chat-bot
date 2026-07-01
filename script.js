// ============================================
//  AI Chat Assistant - Telegram Web App Script
// ============================================

// --- Configuration ---
const CONFIG = {
    API_KEY: 'sk-proj-' + 'UTKgDyuqCA3l_NKo7wt4TtLvS5uX2kMhpvPY2U5PyM-_VRWp0lla_jAzF_CotjsVMIj1VhXR-cT3BlbkFJJo2xgRlX4_ICDN0VqzPytBz2G95hyR8QkSetPExslb27Vcc4fmBd-ZGKY6m17P_S6LAfesV4YA',
    BOT_TOKEN: '8986244844:AAF9nt3XDiCeHSMnGpw6NtLcuDsOD7bFAao',
    API_URL: 'https://api.openai.com/v1/chat/completions',
    DEFAULT_MODEL: 'gpt-4o-mini',
    MAX_HISTORY: 20,
    SYSTEM_PROMPT: 'You are a helpful, friendly AI assistant. You respond concisely and clearly. Use markdown formatting when appropriate. If someone writes in Bengali/Bangla, respond in Bengali.'
};


// --- State ---
let state = {
    messages: [],
    currentModel: CONFIG.DEFAULT_MODEL,
    isGenerating: false,
    abortController: null
};

// --- DOM Elements ---
const $ = (id) => document.getElementById(id);
const chatArea = $('chatArea');
const messagesContainer = $('messagesContainer');
const welcomeScreen = $('welcomeScreen');
const typingIndicator = $('typingIndicator');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const clearBtn = $('clearBtn');
const modelBtn = $('modelBtn');
const modelModal = $('modelModal');
const closeModal = $('closeModal');
const statusText = $('statusText');

// --- Telegram WebApp Integration ---
let tg = null;
try {
    tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Apply Telegram theme
        if (tg.themeParams) {
            const theme = tg.themeParams;
            if (theme.bg_color) {
                document.documentElement.style.setProperty('--bg-primary', theme.bg_color);
            }
            if (theme.secondary_bg_color) {
                document.documentElement.style.setProperty('--bg-secondary', theme.secondary_bg_color);
            }
        }
        
        // Haptic feedback helper
        window.haptic = (type = 'light') => {
            try { tg.HapticFeedback?.impactOccurred(type); } catch(e) {}
        };
    }
} catch(e) {
    console.log('Not running in Telegram WebApp context');
}

if (!window.haptic) {
    window.haptic = () => {};
}

// --- Initialize ---
function init() {
    loadChat();
    setupEventListeners();
    autoResizeTextarea();
    
    if (state.messages.length > 0) {
        hideWelcome();
        renderAllMessages();
        scrollToBottom();
    }
    
    // Set active model in modal
    updateModelUI();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Send message
    sendBtn.addEventListener('click', handleSend);
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    
    // Input changes
    messageInput.addEventListener('input', () => {
        autoResizeTextarea();
        sendBtn.disabled = !messageInput.value.trim();
    });
    
    // Clear chat
    clearBtn.addEventListener('click', () => {
        if (state.messages.length === 0) return;
        haptic('medium');
        clearChat();
    });
    
    // Model selector
    modelBtn.addEventListener('click', () => {
        haptic('light');
        modelModal.classList.add('active');
    });
    
    closeModal.addEventListener('click', () => {
        modelModal.classList.remove('active');
    });
    
    modelModal.addEventListener('click', (e) => {
        if (e.target === modelModal) {
            modelModal.classList.remove('active');
        }
    });
    
    // Model options
    document.querySelectorAll('.model-option').forEach(btn => {
        btn.addEventListener('click', () => {
            haptic('light');
            state.currentModel = btn.dataset.model;
            updateModelUI();
            modelModal.classList.remove('active');
            localStorage.setItem('selectedModel', state.currentModel);
        });
    });
    
    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', () => {
            haptic('light');
            messageInput.value = btn.dataset.prompt;
            sendBtn.disabled = false;
            handleSend();
        });
    });
}

// --- Auto-resize Textarea ---
function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// --- Model UI ---
function updateModelUI() {
    const saved = localStorage.getItem('selectedModel');
    if (saved) state.currentModel = saved;
    
    document.querySelectorAll('.model-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.model === state.currentModel);
    });
}

// --- Chat Logic ---
async function handleSend() {
    const text = messageInput.value.trim();
    if (!text || state.isGenerating) return;
    
    haptic('light');
    hideWelcome();
    
    // Add user message
    const userMsg = { role: 'user', content: text };
    state.messages.push(userMsg);
    renderMessage(userMsg);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    scrollToBottom();
    
    // Generate response
    await generateResponse();
}

async function generateResponse() {
    state.isGenerating = true;
    showTyping();
    setStatus('Thinking...');
    
    state.abortController = new AbortController();
    
    // Prepare messages (limit history)
    const historyMessages = state.messages.slice(-CONFIG.MAX_HISTORY);
    const apiMessages = [
        { role: 'system', content: CONFIG.SYSTEM_PROMPT },
        ...historyMessages
    ];
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: state.currentModel,
                messages: apiMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 2048
            }),
            signal: state.abortController.signal
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `API Error: ${response.status}`);
        }
        
        // Stream response
        hideTyping();
        setStatus('Typing...');
        
        const botMsg = { role: 'assistant', content: '' };
        state.messages.push(botMsg);
        const msgElement = renderMessage(botMsg, true);
        const bubbleEl = msgElement.querySelector('.message-bubble');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
                
                try {
                    const data = JSON.parse(line.slice(6));
                    const delta = data.choices?.[0]?.delta?.content;
                    if (delta) {
                        botMsg.content += delta;
                        bubbleEl.innerHTML = formatMarkdown(botMsg.content);
                        bubbleEl.classList.add('streaming-cursor');
                        scrollToBottom();
                    }
                } catch(e) {}
            }
        }
        
        // Finalize
        bubbleEl.classList.remove('streaming-cursor');
        bubbleEl.innerHTML = formatMarkdown(botMsg.content);
        addCopyButtons(bubbleEl);
        
        haptic('light');
        
    } catch (error) {
        hideTyping();
        if (error.name === 'AbortError') {
            console.log('Request aborted');
        } else {
            console.error('API Error:', error);
            renderError(error.message);
            // Remove failed bot message if it was added
            if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === 'assistant' && !state.messages[state.messages.length - 1].content) {
                state.messages.pop();
            }
        }
    } finally {
        state.isGenerating = false;
        state.abortController = null;
        setStatus('Online');
        saveChat();
        scrollToBottom();
    }
}

// --- Render Functions ---
function renderMessage(msg, isStreaming = false) {
    const div = document.createElement('div');
    div.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
    
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const avatarContent = msg.role === 'user' 
        ? '👤' 
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`;
    
    div.innerHTML = `
        <div class="message-avatar">${avatarContent}</div>
        <div class="message-content">
            <div class="message-bubble${isStreaming ? ' streaming-cursor' : ''}">
                ${msg.role === 'user' ? escapeHTML(msg.content) : formatMarkdown(msg.content)}
            </div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(div);
    
    if (!isStreaming && msg.role === 'assistant') {
        addCopyButtons(div.querySelector('.message-bubble'));
    }
    
    return div;
}

function renderAllMessages() {
    messagesContainer.innerHTML = '';
    state.messages.forEach(msg => renderMessage(msg));
}

function renderError(errorMsg) {
    const div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML = `
        <div class="message-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
        </div>
        <div class="message-content">
            <div class="message-bubble error-message">
                <span class="error-text">⚠️ ${escapeHTML(errorMsg)}</span>
                <button class="retry-btn" onclick="retryLast()">🔄 Retry</button>
            </div>
        </div>
    `;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

// --- Retry ---
window.retryLast = function() {
    haptic('light');
    // Remove error element
    const lastMsg = messagesContainer.lastElementChild;
    if (lastMsg) lastMsg.remove();
    generateResponse();
};

// --- Helpers ---
function hideWelcome() {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
}

function showWelcome() {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
    }
}

function showTyping() {
    typingIndicator.classList.add('active');
    scrollToBottom();
}

function hideTyping() {
    typingIndicator.classList.remove('active');
}

function setStatus(text) {
    statusText.textContent = text;
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}

function clearChat() {
    state.messages = [];
    messagesContainer.innerHTML = '';
    showWelcome();
    localStorage.removeItem('chatHistory');
    
    if (state.abortController) {
        state.abortController.abort();
    }
}

// --- Markdown Formatter ---
function formatMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Code blocks (```language\ncode\n```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<div class="code-block-wrapper"><pre><code class="language-${lang || 'text'}">${escapeHTML(code.trim())}</code></pre></div>`;
    });
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:15px">$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:16px">$1</strong>');
    html = html.replace(/^# (.+)$/gm, '<strong style="font-size:17px">$1</strong>');
    
    // Unordered lists
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Line breaks → paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<p>${html}</p>`;
    
    // Clean up
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<div|<ul|<ol|<pre|<strong style)/g, '$1');
    html = html.replace(/(<\/div>|<\/ul>|<\/ol>|<\/pre>)<\/p>/g, '$1');
    
    return html;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Copy Code Button ---
function addCopyButtons(bubbleEl) {
    bubbleEl.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
        if (wrapper.querySelector('.copy-code-btn')) return;
        
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.textContent = 'Copy';
        btn.addEventListener('click', () => {
            const code = wrapper.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Copied!';
                haptic('light');
                setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
            });
        });
        wrapper.appendChild(btn);
    });
}

// --- Persistence ---
function saveChat() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(state.messages));
    } catch(e) {}
}

function loadChat() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            state.messages = JSON.parse(saved);
        }
    } catch(e) {
        state.messages = [];
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', init);
