// Game logic using global songData
const INITIALS = [
    'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
    'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch',
    'sh', 'r', 'z', 'c', 's', 'y', 'w'
];
const FINALS = [
    'a', 'o', 'e', 'i', 'u', 'ü', 'v', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er',
    'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong',
    'ia', 'iao', 'ian', 'iang', 'ua', 'uo', 'uai', 'uan', 'uang', 'iong', 'üan'
];

class Game {
    constructor() {
        this.songs = this.shuffleArray([...window.songData]).slice(0, 10);
        this.currentSongIndex = 0;
        this.score = 0;
        this.gameStatus = []; // Track status for each round
        this.activeSlot = 'initial';
        this.currentInputs = { initial: '', final: '' };
        this.isProcessing = false;

        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            end: document.getElementById('end-screen')
        };

        this.elements = {
            songNum: document.getElementById('current-song-num'),
            totalSongNum: document.getElementById('total-song-num'),
            score: document.getElementById('score'),
            title: document.getElementById('song-title'),
            artist: document.getElementById('song-artist'),
            lyrics: document.getElementById('lyrics-display'),
            targetText: document.getElementById('target-text'),
            initialSlot: document.getElementById('initial-slot'),
            finalSlot: document.getElementById('final-slot'),
            keyboardGrid: document.getElementById('keyboard-grid'),
            tabInitial: document.getElementById('tab-initial'),
            tabFinal: document.getElementById('tab-final'),
            submitBtn: document.getElementById('submit-btn'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            feedback: document.getElementById('feedback'),
            finalScore: document.getElementById('final-score'),
            scoreComment: document.getElementById('score-comment'),
            historySidebar: document.getElementById('history-sidebar'),
            historyList: document.getElementById('history-list'),
            header: document.querySelector('header')
        };

        this.init();
    }

    init() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());

        this.elements.tabInitial.addEventListener('click', () => this.switchTab('initial'));
        this.elements.tabFinal.addEventListener('click', () => this.switchTab('final'));

        this.elements.initialSlot.addEventListener('click', () => this.switchTab('initial'));
        this.elements.finalSlot.addEventListener('click', () => this.switchTab('final'));

        this.elements.submitBtn.addEventListener('click', () => this.submitAnswer());

        if (this.elements.prevBtn) this.elements.prevBtn.addEventListener('click', () => this.goToPrev());
        if (this.elements.nextBtn) this.elements.nextBtn.addEventListener('click', () => this.goToNext());
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.add('hidden'));
        this.screens[screenName].classList.remove('hidden');
        this.screens[screenName].classList.add('fade-in');

        // Move main header to sidebar when in game or end screen
        if (this.elements.header) {
            if (screenName === 'game' || screenName === 'end') {
                this.elements.header.classList.add('in-sidebar');
                this.elements.historySidebar.prepend(this.elements.header);
            } else {
                this.elements.header.classList.remove('in-sidebar');
                document.getElementById('game-container').prepend(this.elements.header);
            }
        }

        if (screenName !== 'game' && this.elements.youtubePlayer) {
            // Video cleanup removed
        }
    }

    startGame() {
        this.currentSongIndex = 0;
        this.score = 0;
        this.updateScore();
        this.clearHistory();

        // Initialize status for 10 rounds
        this.gameStatus = this.songs.map(song => ({
            segment: song.segments[Math.floor(Math.random() * song.segments.length)],
            inputs: { initial: '', final: '' },
            isSubmitted: false,
            isCorrect: false
        }));

        this.showScreen('game');
        this.elements.historySidebar.classList.remove('hidden');
        if (this.elements.totalSongNum) this.elements.totalSongNum.textContent = this.songs.length;
        this.loadSong();
    }

    restartGame() {
        this.songs = this.shuffleArray([...window.songData]).slice(0, 10);
        this.startGame();
    }

    updateScore() {
        this.elements.score.textContent = this.score;
    }

    loadSong() {
        const song = this.songs[this.currentSongIndex];
        const status = this.gameStatus[this.currentSongIndex];
        const segment = status.segment;

        this.elements.songNum.textContent = this.currentSongIndex + 1;
        this.elements.title.textContent = song.title;
        this.elements.artist.textContent = song.artist;

        const highlightedLyrics = song.lyrics.replace(
            segment.text,
            `<span class="highlight">${segment.text}</span>`
        );
        this.elements.lyrics.innerHTML = highlightedLyrics;
        this.elements.targetText.textContent = `「${segment.text}」`;

        // Restore inputs
        this.currentInputs = { ...status.inputs };
        this.elements.initialSlot.textContent = this.currentInputs.initial || '?';
        this.elements.finalSlot.textContent = this.currentInputs.final || '?';

        this.elements.initialSlot.className = `slot ${this.currentInputs.initial ? 'filled' : 'placeholder'}`;
        this.elements.finalSlot.className = `slot ${this.currentInputs.final ? 'filled' : 'placeholder'}`;

        // Navigation visibility
        if (this.elements.prevBtn) this.elements.prevBtn.disabled = this.currentSongIndex === 0;
        if (this.elements.nextBtn) this.elements.nextBtn.disabled = this.currentSongIndex === this.songs.length - 1;

        if (status.isSubmitted) {
            this.elements.submitBtn.classList.add('hidden');
            this.elements.feedback.classList.remove('hidden');
            const correctInitial = segment.initial;
            const correctFinal = segment.final;

            if (status.isCorrect) {
                this.showFeedback('太棒了！聲母與韻母完全正確 ✨', 'correct');
            } else {
                this.showFeedback(`正確答案是：${correctInitial} + ${correctFinal}`, 'wrong');
            }
            this.elements.keyboardGrid.classList.add('hidden');
            this.elements.tabInitial.parentElement.classList.add('hidden');
        } else {
            this.elements.feedback.classList.add('hidden');
            this.elements.keyboardGrid.classList.remove('hidden');
            this.elements.tabInitial.parentElement.classList.remove('hidden');
            this.updateSubmitButtonVisibility();
            this.switchTab(this.activeSlot);
        }

        this.isProcessing = false;
    }

    updateSubmitButtonVisibility() {
        const status = this.gameStatus[this.currentSongIndex];
        if (!status.isSubmitted && this.currentInputs.initial && this.currentInputs.final) {
            this.elements.submitBtn.classList.remove('hidden');
        } else {
            this.elements.submitBtn.classList.add('hidden');
        }
    }

    switchTab(type) {
        this.activeSlot = type;
        this.elements.tabInitial.classList.toggle('active', type === 'initial');
        this.elements.tabFinal.classList.toggle('active', type === 'final');

        this.elements.initialSlot.classList.toggle('active', type === 'initial');
        this.elements.finalSlot.classList.toggle('active', type === 'final');

        this.renderKeyboard(type === 'initial' ? INITIALS : FINALS);
    }

    renderKeyboard(keys) {
        this.elements.keyboardGrid.innerHTML = '';
        keys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.textContent = key;
            btn.addEventListener('click', () => this.handleKeyClick(key));
            this.elements.keyboardGrid.appendChild(btn);
        });
    }

    handleKeyClick(key) {
        if (this.isProcessing || this.gameStatus[this.currentSongIndex].isSubmitted) return;

        this.currentInputs[this.activeSlot] = key;
        this.gameStatus[this.currentSongIndex].inputs[this.activeSlot] = key;

        const slotEl = this.activeSlot === 'initial' ? this.elements.initialSlot : this.elements.finalSlot;
        slotEl.textContent = key;
        slotEl.classList.remove('placeholder');
        slotEl.classList.add('filled');

        this.updateSubmitButtonVisibility();
    }

    goToPrev() {
        if (this.currentSongIndex > 0) {
            this.currentSongIndex--;
            this.loadSong();
        }
    }

    goToNext() {
        if (this.currentSongIndex < this.songs.length - 1) {
            this.currentSongIndex++;
            this.loadSong();
        }
    }

    submitAnswer() {
        if (this.isProcessing || this.gameStatus[this.currentSongIndex].isSubmitted) return;
        this.isProcessing = true;

        const status = this.gameStatus[this.currentSongIndex];
        const { initial, final } = this.currentInputs;
        const correctInitial = status.segment.initial;
        const correctFinal = status.segment.final;

        const isCorrect = (initial === correctInitial && final === correctFinal);

        status.isSubmitted = true;
        status.isCorrect = isCorrect;

        if (isCorrect) {
            this.score += 10;
            this.updateScore();
            this.showFeedback('太棒了！聲母與韻母完全正確 ✨', 'correct');
        } else {
            this.showFeedback(`哎呀，正確答案是：${correctInitial} + ${correctFinal}`, 'wrong');
        }

        this.addHistoryEntry(
            status.segment.text,
            initial,
            final,
            isCorrect,
            isCorrect ? '' : `${correctInitial}${correctFinal}`
        );

        this.elements.submitBtn.classList.add('hidden');
        this.elements.keyboardGrid.classList.add('hidden');
        this.elements.tabInitial.parentElement.classList.add('hidden');

        setTimeout(() => {
            if (this.currentSongIndex < this.songs.length - 1) {
                this.currentSongIndex++;
                this.loadSong();
            } else if (this.gameStatus.every(s => s.isSubmitted)) {
                this.endGame();
            } else {
                this.isProcessing = false;
            }
        }, 2000);
    }

    showFeedback(msg, type) {
        this.elements.feedback.textContent = msg;
        this.elements.feedback.classList.remove('hidden', 'correct', 'wrong');
        this.elements.feedback.classList.add(type);
    }

    endGame() {
        this.elements.finalScore.textContent = this.score;
        let comment = "繼續加油！多練習聲母韻母。";
        if (this.score === 100) comment = "完美！你是拼音大師 🎉";
        else if (this.score >= 80) comment = "很厲害！差一點就完美了 ✨";
        else if (this.score >= 60) comment = "不錯喔！再接再厲 💪";

        this.elements.scoreComment.textContent = comment;
        this.showScreen('end');
    }

    clearHistory() {
        if (this.elements.historyList) {
            this.elements.historyList.innerHTML = '';
        }
    }

    addHistoryEntry(char, initial, final, isCorrect, solution) {
        const item = document.createElement('div');
        item.className = `history-item ${isCorrect ? 'correct' : 'wrong'}`;

        item.innerHTML = `
            <div class="history-char">${char}</div>
            <div class="history-info">
                <div class="history-pinyin">${initial}${final} ${isCorrect ? '✓' : '✗'}</div>
                <div class="history-status">${isCorrect ? '正確' : '錯誤 (答案: ' + solution + ')'}</div>
            </div>
        `;

        if (this.elements.historyList) {
            this.elements.historyList.prepend(item);
        }
    }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
