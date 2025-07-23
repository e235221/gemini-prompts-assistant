// ==UserScript==
// @name         Gemini Prompt Suggester (Dark Mode compatible)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds Notion-like slash commands for prompts in Gemini, with dark mode support.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 定型文プロンプトの定義 ---
    const prompts = [
        'このドキュメントを要約してください。',
        'このwebリンクから要約してください',
        'あなたは情報学部の大学教授です。論文口調でこのドキュメントを評価し，指摘点をまとめ上げた後で，模範となるレポートを作成してください。'
    ];

    // --- 以下は機能を実現するためのコードです。プロンプトをカスタマイズするときは触らないでください---

    let suggester = null;
    let currentInput = null;
    let selectedIndex = 0;

    const GEMINI_INPUT_SELECTOR = 'rich-textarea div[contenteditable="true"]';

    /**
     * Geminiがダークモードか否かを判定する。
     * @returns {boolean} ダークモードであればtrueを返す。
     */
    function isDarkMode() {
        // 本関数は、body要素のクラスリストに 'dark-theme' が含まれるか否かで判定する
        return document.body.classList.contains('dark-theme');
    }

    // サジェストを表示する関数
    function showSuggestions(inputElement) {
        // 本関数は、入力に基づきサジェストUIを生成・表示する
        const query = inputElement.textContent;
        if (!query.startsWith('/')) {
            hideSuggestions();
            return;
        }

        const filteredPrompts = prompts.filter(p => p.toLowerCase().includes(query.slice(1).toLowerCase()));
        if (filteredPrompts.length === 0) {
            hideSuggestions();
            return;
        }

        const darkMode = isDarkMode();

        if (!suggester) {
            suggester = document.createElement('div');
            // サジェスターの共通スタイルを定義する
            suggester.style.position = 'absolute';
            suggester.style.borderRadius = '12px';
            suggester.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
            suggester.style.zIndex = '10000';
            suggester.style.backdropFilter = 'blur(12px)';
            suggester.style.webkitBackdropFilter = 'blur(12px)';
            document.body.appendChild(suggester);
        }

        // --- テーマに応じてスタイルを動的に変更 ---
        if (darkMode) {
            // ダークモード時のスタイルを定義する
            suggester.style.backgroundColor = 'rgba(40, 40, 40, 0.75)';
            suggester.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        } else {
            // ライトモード時のスタイルを定義する
            suggester.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
            suggester.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        }

        suggester.innerHTML = '';
        const selectedBgColor = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';

        filteredPrompts.forEach((prompt, index) => {
            const item = document.createElement('div');
            // 各サジェスト項目のスタイルを定義する
            item.style.padding = '10px 15px';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '8px';
            item.style.margin = '4px';
            item.style.color = darkMode ? 'white' : 'black'; // テーマに応じて文字色を変更
            item.textContent = prompt;

            if (index === selectedIndex) {
                item.style.backgroundColor = selectedBgColor;
            }

            item.addEventListener('mouseover', () => {
                selectedIndex = index;
                updateSelection();
            });
            item.addEventListener('click', () => {
                insertPrompt(inputElement, prompt);
            });
            suggester.appendChild(item);
        });

        const rect = inputElement.getBoundingClientRect();
        suggester.style.left = `${rect.left}px`;
        suggester.style.bottom = `${window.innerHeight - rect.top}px`;
        suggester.style.width = `${rect.width}px`;
        suggester.style.display = 'block';
    }

    function hideSuggestions() {
        if (suggester) {
            suggester.style.display = 'none';
        }
        selectedIndex = 0;
    }

    function insertPrompt(inputElement, prompt) {
        inputElement.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, prompt);
        hideSuggestions();
    }

    function updateSelection() {
        // 本関数は、キーボード操作による選択状態を更新する
        if (!suggester || suggester.style.display === 'none') return;
        
        const darkMode = isDarkMode();
        const selectedBgColor = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
        
        Array.from(suggester.children).forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.backgroundColor = selectedBgColor;
            } else {
                item.style.backgroundColor = 'transparent';
            }
        });
    }

    function handleKeyDown(e) {
        if (!suggester || suggester.style.display === 'none') return;
        const filteredPrompts = prompts.filter(p => p.toLowerCase().includes(currentInput.textContent.slice(1).toLowerCase()));
        if (filteredPrompts.length === 0) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % filteredPrompts.length;
                updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + filteredPrompts.length) % filteredPrompts.length;
                updateSelection();
                break;
            case 'Tab':
            case 'Enter':
                e.preventDefault();
                if (filteredPrompts[selectedIndex]) {
                    insertPrompt(currentInput, filteredPrompts[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                hideSuggestions();
                break;
        }
    }

    function initialize() {
        const inputElement = document.querySelector(GEMINI_INPUT_SELECTOR);
        if (inputElement && !inputElement.dataset.promptHandlerAttached) {
            currentInput = inputElement;
            inputElement.dataset.promptHandlerAttached = 'true';
            inputElement.addEventListener('input', () => {
                currentInput = document.querySelector(GEMINI_INPUT_SELECTOR);
                if (currentInput) {
                    showSuggestions(currentInput);
                }
            });
            document.addEventListener('keydown', handleKeyDown, true);
            inputElement.addEventListener('blur', () => {
                setTimeout(hideSuggestions, 200);
            });
            console.log('Gemini Prompt Suggester initialized (v1.2).');
        }
    }

    // 定期的なチェックに加えて、テーマ変更を監視するオブザーバーを追加
    const themeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'class') {
                // サジェストが表示中であれば、スタイルを即時更新
                if (suggester && suggester.style.display === 'block' && currentInput) {
                    showSuggestions(currentInput);
                }
                break;
            }
        }
    });
    
    // body要素のクラス属性の変更を監視
    themeObserver.observe(document.body, { attributes: true });
    
    setInterval(initialize, 1000);

})();
