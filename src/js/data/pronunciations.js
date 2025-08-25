/**
 * UK English Phonetic Pronunciations Database
 * IPA (International Phonetic Alphabet) pronunciations for vocabulary terms
 */

(function() {
    'use strict';
    
    // Common word pronunciations database
    const wordPronunciations = {
        // Common single words
        'crew': '/kruː/',
        'supplier': '/səˈplaɪə/',
        'plumber': '/ˈplʌmə/',
        'shower': '/ˈʃaʊə/',
        'bathroom': '/ˈbɑːθruːm/',
        'materials': '/məˈtɪəriəlz/',
        'progress': '/ˈprəʊɡres/',
        'prices': '/ˈpraɪsɪz/',
        'plans': '/plænz/',
        'site': '/saɪt/',
        'office': '/ˈɒfɪs/',
        'walls': '/wɔːlz/',
        'floors': '/flɔːz/',
        'doors': '/dɔːz/',
        'week': '/wiːk/',
        'visit': '/ˈvɪzɪt/',
        'work': '/wɜːk/',
        'check': '/tʃek/',
        'change': '/tʃeɪndʒ/',
        'speak': '/spiːk/',
        'include': '/ɪnˈkluːd/',
        'deliver': '/dɪˈlɪvə/',
        'finish': '/ˈfɪnɪʃ/',
        'mention': '/ˈmenʃən/',
        
        // Medical terms
        'medicare': '/ˈmedɪkeə/',
        'doctor': '/ˈdɒktə/',
        'hospital': '/ˈhɒspɪtl/',
        'patient': '/ˈpeɪʃənt/',
        'appointment': '/əˈpɔɪntmənt/',
        'prescription': '/prɪˈskrɪpʃən/',
        'surgery': '/ˈsɜːdʒəri/',
        'emergency': '/ɪˈmɜːdʒənsi/',
        'specialist': '/ˈspeʃəlɪst/',
        'treatment': '/ˈtriːtmənt/',
        'medicine': '/ˈmedsɪn/',
        'health': '/helθ/',
        'clinic': '/ˈklɪnɪk/',
        'nurse': '/nɜːs/',
        'symptoms': '/ˈsɪmptəmz/',
        'diagnosis': '/ˌdaɪəɡˈnəʊsɪs/',
        'referral': '/rɪˈfɜːrəl/',
        'consultation': '/ˌkɒnsəlˈteɪʃən/',
        
        // Government/Legal terms
        'welfare': '/ˈwelfeə/',
        'payment': '/ˈpeɪmənt/',
        'benefit': '/ˈbenɪfɪt/',
        'centrelink': '/ˈsentəlɪŋk/',
        'pension': '/ˈpenʃən/',
        'allowance': '/əˈlaʊəns/',
        'eligibility': '/ˌelɪdʒəˈbɪləti/',
        'application': '/ˌæplɪˈkeɪʃən/',
        'document': '/ˈdɒkjʊmənt/',
        'requirement': '/rɪˈkwaɪəmənt/',
        'government': '/ˈɡʌvənmənt/',
        'policy': '/ˈpɒləsi/',
        'regulation': '/ˌreɡjʊˈleɪʃən/',
        'legal': '/ˈliːɡəl/',
        'court': '/kɔːt/',
        'lawyer': '/ˈlɔːjə/',
        'judge': '/dʒʌdʒ/',
        'evidence': '/ˈevɪdəns/',
        
        // Education terms
        'school': '/skuːl/',
        'university': '/ˌjuːnɪˈvɜːsəti/',
        'student': '/ˈstjuːdənt/',
        'teacher': '/ˈtiːtʃə/',
        'course': '/kɔːs/',
        'assignment': '/əˈsaɪnmənt/',
        'exam': '/ɪɡˈzæm/',
        'test': '/test/',
        'homework': '/ˈhəʊmwɜːk/',
        'lecture': '/ˈlektʃə/',
        'tutorial': '/tjuːˈtɔːriəl/',
        'degree': '/dɪˈɡriː/',
        'certificate': '/səˈtɪfɪkət/',
        'qualification': '/ˌkwɒlɪfɪˈkeɪʃən/',
        
        // Business/Finance terms
        'business': '/ˈbɪznəs/',
        'finance': '/ˈfaɪnæns/',
        'account': '/əˈkaʊnt/',
        'invoice': '/ˈɪnvɔɪs/',
        'receipt': '/rɪˈsiːt/',
        'tax': '/tæks/',
        'budget': '/ˈbʌdʒɪt/',
        'expense': '/ɪkˈspens/',
        'income': '/ˈɪnkʌm/',
        'profit': '/ˈprɒfɪt/',
        'loss': '/lɒs/',
        'investment': '/ɪnˈvestmənt/',
        'loan': '/ləʊn/',
        'mortgage': '/ˈmɔːɡɪdʒ/',
        'interest': '/ˈɪntrəst/',
        'rate': '/reɪt/',
        'bank': '/bæŋk/',
        'credit': '/ˈkredɪt/',
        'debit': '/ˈdebɪt/',
        
        // Travel/Immigration terms
        'passport': '/ˈpɑːspɔːt/',
        'visa': '/ˈviːzə/',
        'immigration': '/ˌɪmɪˈɡreɪʃən/',
        'customs': '/ˈkʌstəmz/',
        'border': '/ˈbɔːdə/',
        'flight': '/flaɪt/',
        'airport': '/ˈeəpɔːt/',
        'luggage': '/ˈlʌɡɪdʒ/',
        'departure': '/dɪˈpɑːtʃə/',
        'arrival': '/əˈraɪvəl/',
        'destination': '/ˌdestɪˈneɪʃən/',
        'travel': '/ˈtrævəl/',
        'tourist': '/ˈtʊərɪst/',
        'embassy': '/ˈembəsi/',
        'consulate': '/ˈkɒnsjʊlət/',
        
        // Common verbs
        'go': '/ɡəʊ/',
        'come': '/kʌm/',
        'see': '/siː/',
        'look': '/lʊk/',
        'want': '/wɒnt/',
        'need': '/niːd/',
        'have': '/hæv/',
        'get': '/ɡet/',
        'make': '/meɪk/',
        'take': '/teɪk/',
        'give': '/ɡɪv/',
        'know': '/nəʊ/',
        'think': '/θɪŋk/',
        'say': '/seɪ/',
        'tell': '/tel/',
        'ask': '/ɑːsk/',
        'use': '/juːz/',
        'find': '/faɪnd/',
        'call': '/kɔːl/',
        'try': '/traɪ/',
        'feel': '/fiːl/',
        'become': '/bɪˈkʌm/',
        'leave': '/liːv/',
        'put': '/pʊt/',
        'mean': '/miːn/',
        'keep': '/kiːp/',
        'let': '/let/',
        'begin': '/bɪˈɡɪn/',
        'seem': '/siːm/',
        'help': '/help/',
        'show': '/ʃəʊ/',
        'hear': '/hɪə/',
        'play': '/pleɪ/',
        'run': '/rʌn/',
        'move': '/muːv/',
        'live': '/lɪv/',
        'believe': '/bɪˈliːv/',
        'bring': '/brɪŋ/',
        'happen': '/ˈhæpən/',
        'write': '/raɪt/',
        'provide': '/prəˈvaɪd/',
        'sit': '/sɪt/',
        'stand': '/stænd/',
        'lose': '/luːz/',
        'pay': '/peɪ/',
        'meet': '/miːt/',
        'include': '/ɪnˈkluːd/',
        'continue': '/kənˈtɪnjuː/',
        'set': '/set/',
        'learn': '/lɜːn/',
        'change': '/tʃeɪndʒ/',
        'lead': '/liːd/',
        'understand': '/ˌʌndəˈstænd/',
        'watch': '/wɒtʃ/',
        'follow': '/ˈfɒləʊ/',
        'stop': '/stɒp/',
        'create': '/kriˈeɪt/',
        'speak': '/spiːk/',
        'read': '/riːd/',
        'spend': '/spend/',
        'grow': '/ɡrəʊ/',
        'open': '/ˈəʊpən/',
        'walk': '/wɔːk/',
        'win': '/wɪn/',
        'teach': '/tiːtʃ/',
        'offer': '/ˈɒfə/',
        'remember': '/rɪˈmembə/',
        'consider': '/kənˈsɪdə/',
        'appear': '/əˈpɪə/',
        'buy': '/baɪ/',
        'wait': '/weɪt/',
        'serve': '/sɜːv/',
        'die': '/daɪ/',
        'send': '/send/',
        'build': '/bɪld/',
        'stay': '/steɪ/',
        'fall': '/fɔːl/',
        'cut': '/kʌt/',
        'reach': '/riːtʃ/',
        'kill': '/kɪl/',
        'raise': '/reɪz/',
        'pass': '/pɑːs/',
        'sell': '/sel/',
        'decide': '/dɪˈsaɪd/',
        'return': '/rɪˈtɜːn/',
        'explain': '/ɪkˈspleɪn/',
        'hope': '/həʊp/',
        'develop': '/dɪˈveləp/',
        'carry': '/ˈkæri/',
        'break': '/breɪk/',
        'receive': '/rɪˈsiːv/',
        'agree': '/əˈɡriː/',
        'support': '/səˈpɔːt/',
        'hit': '/hɪt/',
        'produce': '/prəˈdjuːs/',
        'eat': '/iːt/',
        'cover': '/ˈkʌvə/',
        'catch': '/kætʃ/',
        'draw': '/drɔː/',
        'choose': '/tʃuːz/',
        
        // Banking and financial terms
        'banking': '/ˈbæŋkɪŋ/',
        'systems': '/ˈsɪstəmz/',
        'system': '/ˈsɪstəm/',
        'accounts': '/əˈkaʊnts/',
        'transactions': '/trænˈzækʃənz/',
        'transfer': '/ˈtrænsfɜː/',
        'deposit': '/dɪˈpɒzɪt/',
        'withdrawal': '/wɪðˈdrɔːəl/',
        'statement': '/ˈsteɪtmənt/',
        'balance': '/ˈbæləns/',
        'savings': '/ˈseɪvɪŋz/',
        'loan': '/ləʊn/',
        'mortgage': '/ˈmɔːɡɪdʒ/',
        'interest': '/ˈɪntrəst/',
        'credit': '/ˈkredɪt/',
        'debit': '/ˈdebɪt/',
        'card': '/kɑːd/',
        'pin': '/pɪn/',
        'atm': '/ˌeɪtiːˈem/',
        'branch': '/brɑːntʃ/',
        'online': '/ˈɒnlaɪn/',
        'mobile': '/ˈməʊbaɪl/',
        'app': '/æp/',
        'security': '/sɪˈkjʊərəti/',
        'fraud': '/frɔːd/',
        'verification': '/ˌverɪfɪˈkeɪʃən/',
        'identity': '/aɪˈdentəti/',
        'password': '/ˈpɑːswɜːd/',
        'username': '/ˈjuːzəneɪm/',
        'login': '/ˈlɒɡɪn/',
        'logout': '/ˈlɒɡaʊt/',
        'session': '/ˈseʃən/',
        'timeout': '/ˈtaɪmaʊt/',
        'expired': '/ɪkˈspaɪəd/',
        'invalid': '/ɪnˈvælɪd/',
        'error': '/ˈerə/',
        'successful': '/səkˈsesfəl/',
        'failed': '/feɪld/',
        'pending': '/ˈpendɪŋ/',
        'processing': '/ˈprəʊsesɪŋ/',
        'complete': '/kəmˈpliːt/',
        'completed': '/kəmˈpliːtɪd/',
        'cancelled': '/ˈkænsəld/',
        'rejected': '/rɪˈdʒektɪd/',
        'approved': '/əˈpruːvd/',
        'declined': '/dɪˈklaɪnd/',
        
        // Common compound words
        'double': '/ˈdʌbəl/',
        'social': '/ˈsəʊʃəl/',
        'bulk': '/bʌlk/',
        'billing': '/ˈbɪlɪŋ/',
        'drop': '/drɒp/',
        'by': '/baɪ/',
        'to': '/tuː/',
        'the': '/ðə/',
        'be': '/biː/',
        'pleased': '/pliːzd/',
        'with': '/wɪð/',
        'over': '/ˈəʊvə/',
        'up': '/ʌp/',
        'gone': '/ɡɒn/',
        'down': '/daʊn/',
        'out': '/aʊt/',
        'in': '/ɪn/',
        'on': '/ɒn/',
        'at': '/æt/',
        'for': '/fɔː/',
        'from': '/frɒm/',
        'about': '/əˈbaʊt/',
        'into': '/ˈɪntuː/',
        'through': '/θruː/',
        'during': '/ˈdjʊərɪŋ/',
        'before': '/bɪˈfɔː/',
        'after': '/ˈɑːftə/',
        'above': '/əˈbʌv/',
        'below': '/bɪˈləʊ/',
        'between': '/bɪˈtwiːn/',
        'under': '/ˈʌndə/',
        'again': '/əˈɡen/',
        'further': '/ˈfɜːðə/',
        'then': '/ðen/',
        'once': '/wʌns/',
        'here': '/hɪə/',
        'there': '/ðeə/',
        'when': '/wen/',
        'where': '/weə/',
        'why': '/waɪ/',
        'how': '/haʊ/',
        'all': '/ɔːl/',
        'both': '/bəʊθ/',
        'each': '/iːtʃ/',
        'few': '/fjuː/',
        'more': '/mɔː/',
        'most': '/məʊst/',
        'other': '/ˈʌðə/',
        'some': '/sʌm/',
        'such': '/sʌtʃ/',
        'no': '/nəʊ/',
        'nor': '/nɔː/',
        'not': '/nɒt/',
        'only': '/ˈəʊnli/',
        'own': '/əʊn/',
        'same': '/seɪm/',
        'so': '/səʊ/',
        'than': '/ðæn/',
        'too': '/tuː/',
        'very': '/ˈveri/',
        'can': '/kæn/',
        'will': '/wɪl/',
        'just': '/dʒʌst/',
        'should': '/ʃʊd/',
        'now': '/naʊ/'
    };
    
    /**
     * Get pronunciation for a phrase by looking up individual words
     * @param {string} phrase - The phrase to get pronunciation for
     * @returns {string} - The pronunciation string
     */
    function getPhrasePronunciation(phrase) {
        const words = phrase.toLowerCase().split(/\s+/);
        const pronunciations = [];
        
        for (const word of words) {
            // Remove common punctuation
            const cleanWord = word.replace(/[.,!?;:'"]/g, '');
            
            if (wordPronunciations[cleanWord]) {
                pronunciations.push(wordPronunciations[cleanWord]);
            } else {
                // For unknown words, attempt basic phonetic patterns
                pronunciations.push(attemptPhoneticGuess(cleanWord));
            }
        }
        
        return pronunciations.join(' ');
    }
    
    /**
     * Attempt to guess phonetic pronunciation for unknown words
     * @param {string} word - The word to guess pronunciation for
     * @returns {string} - Guessed IPA pronunciation
     */
    function attemptPhoneticGuess(word) {
        // Common endings and their typical pronunciations
        const endings = {
            'ing': 'ɪŋ',
            'tion': 'ʃən',
            'sion': 'ʒən',
            'ment': 'mənt',
            'ness': 'nəs',
            'ful': 'fʊl',
            'less': 'ləs',
            'ly': 'li',
            'er': 'ə',
            'or': 'ə',
            'ed': 'd',
            'es': 'z',
            's': 's'
        };
        
        // If we can't guess, show the word with tentative marker
        let guess = word;
        
        // Check for common endings
        for (const [ending, sound] of Object.entries(endings)) {
            if (word.endsWith(ending)) {
                const stem = word.slice(0, -ending.length);
                // Check if we know the stem
                const cleanStem = stem.replace(/[.,!?;:'"]/g, '');
                if (wordPronunciations[cleanStem]) {
                    return wordPronunciations[cleanStem].slice(0, -1) + sound + '/';
                }
            }
        }
        
        // If still unknown, return with question mark to indicate uncertainty
        return `/ˈ${guess}?/`;
    }
    
    /**
     * Get UK pronunciation for a term
     * @param {string} term - The term to get pronunciation for
     * @returns {string} - The UK pronunciation with IPA notation
     */
    function getUKPronunciation(term) {
        if (!term) return '';
        
        const lowerTerm = term.toLowerCase().trim();
        
        // Check if it's a single word in our database
        if (wordPronunciations[lowerTerm]) {
            return `UK ${wordPronunciations[lowerTerm]}`;
        }
        
        // Handle phrases
        const pronunciation = getPhrasePronunciation(lowerTerm);
        return `UK ${pronunciation}`;
    }
    
    // Export to window
    window.pronunciationDB = {
        getUKPronunciation: getUKPronunciation,
        wordPronunciations: wordPronunciations
    };
    
    console.log('Pronunciation database loaded with', Object.keys(wordPronunciations).length, 'words');
})();