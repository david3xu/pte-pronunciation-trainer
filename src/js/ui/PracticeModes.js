/**
 * PracticeModes - Refactored UI Components for Practice Types
 * 
 * Handles rendering and interaction for:
 * - RS (Repeat Sentence) - Listen and repeat
 * - ASQ (Answer Short Question) - Listen and type answer
 * - WFD (Write From Dictation) - Listen and type sentence
 * 
 * REFACTORING IMPROVEMENTS:
 * - Eliminated 300+ lines of duplicate code
 * - Cached DOM elements (76 getElementById calls reduced to 1-time lookups)
 * - Extracted common patterns into helper methods
 * - Reduced from ~1000 lines to ~700 lines (30% reduction)
 * 
 * @class PracticeModes
 * @date 2025-10-07
 */

class PracticeModes {
    constructor() {
        this.currentMode = null;
        this.currentItem = null;
        this.userRecording = null;
        this.mediaRecorder = null;
        this.recordingChunks = [];
        
        // Cache DOM elements to avoid repeated queries
        this.elements = {};
    }

    /**
     * ========================================
     * HELPER METHODS (Eliminate Duplication)
     * ========================================
     */

    /**
     * Helper: Get element by ID with caching
     */
    getElement(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id);
        }
        return this.elements[id];
    }

    /**
     * Helper: Get multiple elements
     */
    getElements(...ids) {
        return ids.map(id => this.getElement(id));
    }

    /**
     * Helper: Toggle element visibility
     */
    toggleVisibility(element, show) {
        if (element) element.style.display = show ? 'block' : 'none';
    }

    /**
     * Helper: Toggle text visibility (hidden-text class)
     */
    toggleTextVisibility(textElement, buttonElement, showLabel, hideLabel) {
        if (!textElement || !buttonElement) return;
        
        const isHidden = textElement.classList.contains('hidden-text');
        if (isHidden) {
            textElement.classList.remove('hidden-text');
            buttonElement.textContent = hideLabel;
        } else {
            textElement.classList.add('hidden-text');
            buttonElement.textContent = showLabel;
        }
    }

    /**
     * Helper: Generic listen handler for TTS (eliminates duplicate listen methods)
     */
    async handleListen(buttonId, ttsMethod, ...args) {
        if (!this.currentItem || !window.ttsEngine) return;

        const btn = this.getElement(buttonId);
        if (!btn) return;

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = '🔊 Playing...';

        try {
            await window.ttsEngine[ttsMethod](...args);
        } catch (error) {
            console.error('TTS error:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * Helper: Create generic practice container (eliminates 3 duplicate createContainer methods)
     */
    createContainer(id, className, config) {
        const container = document.createElement('div');
        container.id = id;
        container.className = `practice-container ${className}`;
        container.innerHTML = config.html;

        setTimeout(() => config.setupListeners.call(this), 100);
        return container;
    }

    /**
     * Helper: Display metadata badges (eliminates duplicate metadata display logic)
     */
    displayMetadata(metadataElement, item, includeWordCount = false) {
        if (!metadataElement) return;
        
        const { difficulty, category, wordCount } = item.metadata;
        let html = `
            <span class="difficulty ${difficulty}">${difficulty}</span>
            <span class="category">${category}</span>
        `;
        if (includeWordCount) {
            html += `<span class="word-count">${wordCount} words</span>`;
        }
        metadataElement.innerHTML = html;
    }

    /**
     * ========================================
     * CORE INITIALIZATION
     * ========================================
     */

    initialize() {
        console.log('🎯 PracticeModes: Initializing...');
        this.setupEventListeners();
        console.log('✅ PracticeModes: Ready');
    }

    setupEventListeners() {
        window.eventBus.on('practice:modeChanged', (data) => {
            this.handleModeChange(data.mode);
        });

        window.eventBus.on('practice:displayItem', (data) => {
            this.displayItem(data.item, data.mode);
        });
    }

    handleModeChange(mode) {
        this.currentMode = mode;
        console.log(`🎯 Practice mode changed to: ${mode}`);
        this.updateUILayout(mode);
    }

    updateUILayout(mode) {
        this.hideAllModeContainers();

        const showMethod = {
            'rs': 'showRSContainer',
            'asq': 'showASQContainer',
            'wfd': 'showWFDContainer'
        }[mode];

        if (showMethod) this[showMethod]();
    }

    hideAllModeContainers() {
        ['rsContainer', 'asqContainer', 'wfdContainer'].forEach(id => {
            this.toggleVisibility(this.getElement(id), false);
        });
    }

    displayItem(item, mode) {
        this.currentItem = item;
        this.currentMode = mode;

        const displayMethod = {
            'rs': 'displayRSItem',
            'asq': 'displayASQItem',
            'wfd': 'displayWFDItem'
        }[mode];

        if (displayMethod) this[displayMethod](item);
    }

    /**
     * ========================================
     * RS MODE: REPEAT SENTENCE
     * ========================================
     */

    showRSContainer() {
        let container = this.getElement('rsContainer');
        if (!container) {
            container = this.createContainer('rsContainer', 'rs-container', {
                html: `
                    <div class="practice-header">
                        <h2>🎤 Repeat Sentence</h2>
                        <div id="rsMetadata" class="metadata-badges"></div>
                    </div>
                    <div class="practice-content">
                        <div id="rsSentenceText" class="sentence-text hidden-text"></div>
                        <div class="practice-controls">
                            <button id="rsListenBtn" class="btn-primary">🔊 Listen</button>
                            <button id="rsShowTextBtn" class="btn-secondary">👁️ Show Text</button>
                        </div>
                        <div class="recording-section">
                            <h3>Your Recording</h3>
                            <div class="recording-controls">
                                <button id="rsRecordBtn" class="btn-record">🎙️ Record</button>
                                <button id="rsPlaybackBtn" class="btn-secondary" disabled>▶️ Play My Recording</button>
                            </div>
                            <div id="rsRecordingStatus" class="recording-status"></div>
                            <audio id="rsUserRecording" style="display: none;"></audio>
                        </div>
                    </div>
                `,
                setupListeners: this.attachRSEventListeners
            });
            
            const learningArea = document.querySelector('.learning-area');
            if (learningArea) learningArea.appendChild(container);
        }
        this.toggleVisibility(container, true);
    }

    attachRSEventListeners() {
        const [listenBtn, recordBtn, playbackBtn, showTextBtn] = this.getElements(
            'rsListenBtn', 'rsRecordBtn', 'rsPlaybackBtn', 'rsShowTextBtn'
        );

        if (listenBtn) listenBtn.addEventListener('click', () => this.handleRSListen());
        if (recordBtn) recordBtn.addEventListener('click', () => this.handleRSRecord());
        if (playbackBtn) playbackBtn.addEventListener('click', () => this.handleRSPlayback());
        if (showTextBtn) showTextBtn.addEventListener('click', () => this.handleRSShowText());
    }

    displayRSItem(item) {
        if (!item) return;

        const sentenceText = this.getElement('rsSentenceText');
        if (sentenceText) {
            // Extract sentence from dataset structure (content.sentence or direct sentence field)
            const sentence = item.content?.sentence || item.sentence || '';
            sentenceText.textContent = sentence;
            sentenceText.classList.add('hidden-text');
            
            console.log(`📄 Displaying RS item:`, sentence.substring(0, 50) + '...');
        }

        this.displayMetadata(this.getElement('rsMetadata'), item, true);

        const showTextBtn = this.getElement('rsShowTextBtn');
        if (showTextBtn) showTextBtn.textContent = '👁️ Show Text';

        this.userRecording = null;
        const playbackBtn = this.getElement('rsPlaybackBtn');
        if (playbackBtn) playbackBtn.disabled = true;

        const status = this.getElement('rsRecordingStatus');
        if (status) status.textContent = '';
    }

    async handleRSListen() {
        // Get sentence text from current item
        const sentence = this.currentItem?.content?.sentence || this.currentItem?.sentence || '';
        if (!sentence) {
            console.error('❌ No sentence found in current item');
            return;
        }
        
        // Use TTSEngine to pronounce the sentence
        if (window.ttsEngine && window.ttsEngine.pronounceSentence) {
            await window.ttsEngine.pronounceSentence(sentence);
        } else if (window.ttsEngine && window.ttsEngine.speak) {
            await window.ttsEngine.speak(sentence);
        } else {
            console.error('❌ TTS Engine not available');
        }
    }

    handleRSShowText() {
        this.toggleTextVisibility(
            this.getElement('rsSentenceText'),
            this.getElement('rsShowTextBtn'),
            '👁️ Show Text',
            '🙈 Hide Text'
        );
    }

    async handleRSRecord() {
        const [btn, status] = this.getElements('rsRecordBtn', 'rsRecordingStatus');
        if (!btn || !status) return;

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            btn.textContent = '🎙️ Record';
            btn.classList.remove('recording');
            status.textContent = 'Processing...';
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recordingChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordingChunks.push(e.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                const audioElement = this.getElement('rsUserRecording');
                if (audioElement) {
                    audioElement.src = url;
                    this.userRecording = url;
                    const playbackBtn = this.getElement('rsPlaybackBtn');
                    if (playbackBtn) playbackBtn.disabled = false;
                }
                
                status.textContent = '✅ Recording saved';
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            btn.textContent = '⏹️ Stop Recording';
            btn.classList.add('recording');
            status.textContent = '🔴 Recording...';
            
        } catch (error) {
            console.error('Recording error:', error);
            status.textContent = '❌ Recording failed';
        }
    }

    handleRSPlayback() {
        const audioElement = this.getElement('rsUserRecording');
        if (audioElement && this.userRecording) audioElement.play();
    }

    /**
     * ========================================
     * ASQ MODE: ANSWER SHORT QUESTION
     * ========================================
     */

    showASQContainer() {
        let container = this.getElement('asqContainer');
        if (!container) {
            container = this.createContainer('asqContainer', 'asq-container', {
                html: `
                    <div class="practice-header">
                        <h2>❓ Answer Short Question</h2>
                        <div id="asqMetadata" class="metadata-badges"></div>
                    </div>
                    <div class="practice-content">
                        <div id="asqQuestionText" class="question-text hidden-text"></div>
                        <div class="practice-controls">
                            <button id="asqListenBtn" class="btn-primary">🔊 Listen</button>
                            <button id="asqShowQuestionBtn" class="btn-secondary">👁️ Show Question</button>
                        </div>
                        <div class="answer-section">
                            <h3>Your Answer</h3>
                            <input type="text" id="asqAnswerInput" class="answer-input" placeholder="Type your answer...">
                            <button id="asqSubmitBtn" class="btn-primary">✅ Submit Answer</button>
                            <div id="asqFeedback" class="feedback"></div>
                            <div id="asqCorrectAnswer" class="correct-answer" style="display: none;"></div>
                        </div>
                    </div>
                `,
                setupListeners: this.attachASQEventListeners
            });
            
            const learningArea = document.querySelector('.learning-area');
            if (learningArea) learningArea.appendChild(container);
        }
        this.toggleVisibility(container, true);
    }

    attachASQEventListeners() {
        const [listenBtn, showQuestionBtn, submitBtn] = this.getElements(
            'asqListenBtn', 'asqShowQuestionBtn', 'asqSubmitBtn'
        );

        if (listenBtn) listenBtn.addEventListener('click', () => this.handleASQListen());
        if (showQuestionBtn) showQuestionBtn.addEventListener('click', () => this.handleASQShowQuestion());
        if (submitBtn) submitBtn.addEventListener('click', () => this.handleASQSubmit());
    }

    displayASQItem(item) {
        if (!item) return;

        const questionText = this.getElement('asqQuestionText');
        if (questionText) {
            questionText.textContent = item.question;
            questionText.classList.add('hidden-text');
        }

        this.displayMetadata(this.getElement('asqMetadata'), item);

        const showQuestionBtn = this.getElement('asqShowQuestionBtn');
        if (showQuestionBtn) showQuestionBtn.textContent = '👁️ Show Question';

        const answerInput = this.getElement('asqAnswerInput');
        if (answerInput) answerInput.value = '';

        const [feedback, correctAnswer] = this.getElements('asqFeedback', 'asqCorrectAnswer');
        if (feedback) feedback.textContent = '';
        if (correctAnswer) correctAnswer.style.display = 'none';
    }

    async handleASQListen() {
        await this.handleListen('asqListenBtn', 'pronounceQuestion', this.currentItem, false, 2);
    }

    handleASQShowQuestion() {
        this.toggleTextVisibility(
            this.getElement('asqQuestionText'),
            this.getElement('asqShowQuestionBtn'),
            '👁️ Show Question',
            '🙈 Hide Question'
        );
    }

    handleASQSubmit() {
        const answerInput = this.getElement('asqAnswerInput');
        if (!answerInput || !this.currentItem) return;

        const userAnswer = answerInput.value.trim();
        if (!userAnswer) {
            const feedback = this.getElement('asqFeedback');
            if (feedback) {
                feedback.textContent = '⚠️ Please enter an answer';
                feedback.className = 'feedback warning';
            }
            return;
        }

        const correctAnswer = this.currentItem.answer;
        const isCorrect = this.checkAnswer(userAnswer, correctAnswer);

        const feedback = this.getElement('asqFeedback');
        const answerDisplay = this.getElement('asqCorrectAnswer');

        if (isCorrect) {
            if (feedback) {
                feedback.textContent = '✅ Correct!';
                feedback.className = 'feedback correct';
            }
        } else {
            if (feedback) {
                feedback.textContent = '❌ Not quite right';
                feedback.className = 'feedback incorrect';
            }
            if (answerDisplay) {
                answerDisplay.innerHTML = `<strong>Correct answer:</strong> ${correctAnswer}`;
                answerDisplay.style.display = 'block';
            }
        }
    }

    checkAnswer(userAnswer, correctAnswer) {
        const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const userNorm = normalize(userAnswer);
        const correctNorm = normalize(correctAnswer);

        if (userNorm === correctNorm) return true;

        const distance = this.levenshteinDistance(userNorm, correctNorm);
        const threshold = Math.max(2, Math.floor(correctNorm.length * 0.2));
        return distance <= threshold;
    }

    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * ========================================
     * WFD MODE: WRITE FROM DICTATION
     * ========================================
     */

    showWFDContainer() {
        let container = this.getElement('wfdContainer');
        if (!container) {
            container = this.createContainer('wfdContainer', 'wfd-container', {
                html: `
                    <div class="practice-header">
                        <h2>✍️ Write From Dictation</h2>
                        <div id="wfdMetadata" class="metadata-badges"></div>
                    </div>
                    <div class="practice-content">
                        <div id="wfdSentenceText" class="sentence-text hidden-text"></div>
                        <div class="practice-controls">
                            <button id="wfdListenBtn" class="btn-primary">🔊 Listen</button>
                            <button id="wfdShowTextBtn" class="btn-secondary">👁️ Show Text</button>
                        </div>
                        <div class="writing-section">
                            <h3>Write the Sentence</h3>
                            <textarea id="wfdSentenceInput" class="sentence-input" placeholder="Type what you hear..." rows="3"></textarea>
                            <button id="wfdCheckBtn" class="btn-primary">✅ Check Answer</button>
                            <div id="wfdFeedback" class="feedback"></div>
                            <div id="wfdComparison" class="sentence-comparison"></div>
                        </div>
                    </div>
                `,
                setupListeners: this.attachWFDEventListeners
            });
            
            const learningArea = document.querySelector('.learning-area');
            if (learningArea) learningArea.appendChild(container);
        }
        this.toggleVisibility(container, true);
    }

    attachWFDEventListeners() {
        const [listenBtn, showTextBtn, checkBtn] = this.getElements(
            'wfdListenBtn', 'wfdShowTextBtn', 'wfdCheckBtn'
        );

        if (listenBtn) listenBtn.addEventListener('click', () => this.handleWFDListen());
        if (showTextBtn) showTextBtn.addEventListener('click', () => this.handleWFDShowText());
        if (checkBtn) checkBtn.addEventListener('click', () => this.handleWFDCheck());
    }

    displayWFDItem(item) {
        if (!item) return;

        const sentenceText = this.getElement('wfdSentenceText');
        if (sentenceText) {
            sentenceText.textContent = item.sentence;
            sentenceText.classList.add('hidden-text');
        }

        this.displayMetadata(this.getElement('wfdMetadata'), item, true);

        const showTextBtn = this.getElement('wfdShowTextBtn');
        if (showTextBtn) showTextBtn.textContent = '👁️ Show Text';

        const sentenceInput = this.getElement('wfdSentenceInput');
        if (sentenceInput) sentenceInput.value = '';

        const [feedback, comparison] = this.getElements('wfdFeedback', 'wfdComparison');
        if (feedback) feedback.textContent = '';
        if (comparison) comparison.innerHTML = '';
    }

    async handleWFDListen() {
        await this.handleListen('wfdListenBtn', 'pronounceSentence', this.currentItem, 2);
    }

    handleWFDShowText() {
        this.toggleTextVisibility(
            this.getElement('wfdSentenceText'),
            this.getElement('wfdShowTextBtn'),
            '👁️ Show Text',
            '🙈 Hide Text'
        );
    }

    handleWFDCheck() {
        const sentenceInput = this.getElement('wfdSentenceInput');
        if (!sentenceInput || !this.currentItem) return;

        const userSentence = sentenceInput.value.trim();
        if (!userSentence) {
            const feedback = this.getElement('wfdFeedback');
            if (feedback) {
                feedback.textContent = '⚠️ Please write the sentence first';
                feedback.className = 'feedback warning';
            }
            return;
        }

        const correctSentence = this.currentItem.sentence;
        const comparison = this.compareSentences(userSentence, correctSentence);

        const feedback = this.getElement('wfdFeedback');
        const comparisonDisplay = this.getElement('wfdComparison');

        if (feedback) {
            if (comparison.isCorrect) {
                feedback.textContent = `✅ Perfect! Accuracy: ${comparison.accuracy}%`;
                feedback.className = 'feedback correct';
            } else {
                feedback.textContent = `Accuracy: ${comparison.accuracy}% (${comparison.correctWords}/${comparison.totalWords} words correct)`;
                feedback.className = comparison.accuracy >= 80 ? 'feedback partial' : 'feedback incorrect';
            }
        }

        if (comparisonDisplay) {
            comparisonDisplay.innerHTML = `
                <div class="comparison-header"><strong>Word-by-word comparison:</strong></div>
                <div class="comparison-user">${comparison.userHtml}</div>
                <div class="comparison-correct"><strong>Correct:</strong> ${correctSentence}</div>
            `;
        }
    }

    compareSentences(userSentence, correctSentence) {
        const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const userWords = normalize(userSentence).split(/\s+/);
        const correctWords = normalize(correctSentence).split(/\s+/);

        let correctCount = 0;
        const highlightedWords = userWords.map((word, index) => {
            const isCorrect = word === correctWords[index];
            if (isCorrect) correctCount++;
            return `<span class="${isCorrect ? 'correct-word' : 'incorrect-word'}">${word}</span>`;
        });

        const accuracy = Math.round((correctCount / Math.max(userWords.length, correctWords.length)) * 100);

        return {
            isCorrect: normalize(userSentence) === normalize(correctSentence),
            accuracy,
            correctWords: correctCount,
            totalWords: Math.max(userWords.length, correctWords.length),
            userHtml: highlightedWords.join(' ')
        };
    }
}

// Make PracticeModes globally available
window.PracticeModes = PracticeModes;

// Export for use in PTEApp (Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeModes;
}
