/**
 * Category Model - Represents a dialogue category
 */

class Category {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.emoji = data.emoji;
        this.description = data.description;
        this.color = data.color;
        this.priority = data.priority;
        
        this._validate();
    }

    _validate() {
        if (!this.id || !this.name || !this.emoji) {
            throw new Error('Category missing required fields');
        }
        
        if (!this.priority || typeof this.priority !== 'number') {
            this.priority = 999;
        }
    }

    getDisplayName() {
        return `${this.emoji} ${this.name}`;
    }

    getShortName() {
        return this.name.split(' ')[0]; // First word only
    }

    getCSSClass() {
        return `category-${this.id}`;
    }

    getStyle() {
        return {
            '--category-color': this.color,
            '--category-priority': this.priority
        };
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            emoji: this.emoji,
            description: this.description,
            color: this.color,
            priority: this.priority
        };
    }
}

if (typeof window !== 'undefined') {
    window.Category = Category;
}
