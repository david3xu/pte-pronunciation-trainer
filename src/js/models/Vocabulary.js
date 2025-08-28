/**
 * Vocabulary Model - Represents a single vocabulary term
 */

class Vocabulary {
    constructor(data) {
        this.term = data.term;
        this.conversation_id = data.conversation_id;
        this.sentence_id = data.sentence_id;
        this.difficulty = data.difficulty;
        this.category = data.category;
        this.phonetic = data.phonetic;
        this.example = data.example;
        this.example_chinese = data.example_chinese;
        
        this._validate();
    }

    _validate() {
        if (!this.term || !this.conversation_id || !this.category) {
            throw new Error('Vocabulary missing required fields');
        }
        
        if (!['easy', 'normal', 'hard'].includes(this.difficulty)) {
            this.difficulty = 'normal';
        }
    }

    getDifficultyEmoji() {
        const emojis = {
            'easy': '🟢',
            'normal': '🟡',
            'hard': '🔴'
        };
        return emojis[this.difficulty] || '🟡';
    }

    getDifficultyLabel() {
        return this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
    }

    getCategoryEmoji() {
        const categoryEmojis = {
            'business': '💼',
            'legal': '⚖️',
            'medical': '🏥',
            'education': '🎓',
            'housing': '🏠',
            'social': '👥',
            'social-welfare': '🤝',
            'immigration': '🛂',
            'tourism': '✈️'
        };
        return categoryEmojis[this.category] || '❓';
    }

    getDisplayData() {
        return {
            term: this.term,
            difficulty: this.difficulty,
            difficultyEmoji: this.getDifficultyEmoji(),
            difficultyLabel: this.getDifficultyLabel(),
            category: this.category,
            categoryEmoji: this.getCategoryEmoji(),
            phonetic: this.phonetic,
            example: this.example,
            example_chinese: this.example_chinese,
            conversation_id: this.conversation_id,
            sentence_id: this.sentence_id
        };
    }

    toJSON() {
        return {
            term: this.term,
            conversation_id: this.conversation_id,
            sentence_id: this.sentence_id,
            difficulty: this.difficulty,
            category: this.category,
            phonetic: this.phonetic,
            example: this.example,
            example_chinese: this.example_chinese
        };
    }
}

if (typeof window !== 'undefined') {
    window.Vocabulary = Vocabulary;
}
