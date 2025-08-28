/**
 * Dialogue Model - Represents a single CCL dialogue
 */

class Dialogue {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.category = data.category;
        this.briefing = data.briefing || '';
        this.sentences = data.sentences || [];
        this.metadata = data.metadata || {};
        
        this._validate();
    }

    _validate() {
        if (!this.id || !this.title || !this.category) {
            throw new Error('Dialogue missing required fields');
        }
    }

    getTotalVocabularyTerms() {
        return this.sentences.reduce((total, sentence) => {
            return total + (sentence.vocabulary ? sentence.vocabulary.length : 0);
        }, 0);
    }

    getTotalSentences() {
        return this.sentences.length;
    }

    getDifficultyDistribution() {
        const distribution = { easy: 0, normal: 0, hard: 0 };
        
        for (const sentence of this.sentences) {
            if (sentence.vocabulary) {
                for (const vocab of sentence.vocabulary) {
                    const difficulty = vocab.difficulty || 'normal';
                    if (distribution[difficulty] !== undefined) {
                        distribution[difficulty]++;
                    }
                }
            }
        }
        return distribution;
    }

    getSentenceById(id) {
        return this.sentences.find(sentence => sentence.id === id) || null;
    }

    getAllVocabularyTerms() {
        const terms = [];
        for (const sentence of this.sentences) {
            if (sentence.vocabulary) {
                terms.push(...sentence.vocabulary);
            }
        }
        return terms;
    }

    getVocabularyByDifficulty(difficulty) {
        if (!['easy', 'normal', 'hard'].includes(difficulty)) {
            return [];
        }
        
        const terms = [];
        for (const sentence of this.sentences) {
            if (sentence.vocabulary) {
                const filtered = sentence.vocabulary.filter(vocab => vocab.difficulty === difficulty);
                terms.push(...filtered);
            }
        }
        return terms;
    }

    getSummary() {
        return {
            id: this.id,
            title: this.title,
            category: this.category,
            totalSentences: this.getTotalSentences(),
            totalVocabularyTerms: this.getTotalVocabularyTerms(),
            difficultyDistribution: this.getDifficultyDistribution()
        };
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            category: this.category,
            briefing: this.briefing,
            sentences: this.sentences,
            metadata: this.metadata
        };
    }
}

if (typeof window !== 'undefined') {
    window.Dialogue = Dialogue;
}
