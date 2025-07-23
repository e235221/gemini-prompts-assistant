// ==UserScript==
// @name         Gemini Prompt Suggester
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds Notion-like slash commands for prompts in Gemini.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	// --- ここに定型文プロンプトを定義 ---
	const prompts = [
		`について具体的なアルゴリズムと応用事例，メリット・デメリットを教えてください。`,
		'について研究が行われた分野の背景や，従来の問題点を簡潔にまとめてください。何がすごいのかについても明確にしてください。',
		'論文口調かつ箇条書きで以下の文章をまとめてください',
		'このドキュメントを要約してください。',
		'このwebリンクから要約してください',
		'あなたは情報学部の大学教授です。論文口調でこのドキュメントを評価し，指摘点をまとめ上げた後で，模範となるレポートを作成してください。',
		'添付するレポートについて，辛口で内容・書き方を評価してください。不明瞭な部分があれば，それも指摘してください。指摘後に，修正版のレポートも提示して下さい。',
		'初学者にも理解できるように平易な言葉で解説してください。'
		`あなたはPython のエキスパートデバッガーです。以下のコードを実行した際に発生したエラーの原因を特定し，解決策を提案してください。
`
	];

	// --- 以下は機能を実現するためのコードです ---

	let suggester = null;
	let currentInput = null;
	let selectedIndex = 0;

	// Geminiの入力欄を特定するためのセレクタ
	const GEMINI_INPUT_SELECTOR = 'rich-textarea div[contenteditable="true"]';

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

		if (!suggester) {
			suggester = document.createElement('div');
			// サジェスターの基本的なスタイルを定義する
			suggester.style.position = 'absolute';
			suggester.style.border = '1px solid rgba(204, 204, 204, 0.5)'; // 境界線も少し透明に
			suggester.style.borderRadius = '12px'; // 角を少し丸く
			suggester.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
			suggester.style.zIndex = '10000';

			// 背景のスタイルをぼかし効果（すりガラス）に変更
			suggester.style.backgroundColor = 'rgba(255, 255, 255, 0.65)'; // 背景色を半透明の白に設定
			suggester.style.backdropFilter = 'blur(12px)';                   // 背景のぼかし効果を適用
			suggester.style.webkitBackdropFilter = 'blur(12px)';             // Safari用のベンダープレフィックス

			document.body.appendChild(suggester);
		}

		suggester.innerHTML = '';
		filteredPrompts.forEach((prompt, index) => {
			const item = document.createElement('div');
			// 各サジェスト項目のスタイルを定義する
			item.style.padding = '10px 15px';
			item.style.cursor = 'pointer';
			item.style.color = 'black'; // 文字色を明示的に黒に設定
			item.style.borderRadius = '8px';
			item.style.margin = '4px';

			item.textContent = prompt;
			if (index === selectedIndex) {
				item.style.backgroundColor = 'rgba(0, 0, 0, 0.08)'; // 選択中の背景色を少し濃いグレーに
			}
			item.addEventListener('mouseover', () => {
				selectedIndex = index;
				updateSelection(filteredPrompts);
			});
			item.addEventListener('click', () => {
				insertPrompt(inputElement, prompt);
			});
			suggester.appendChild(item);
		});

		const rect = inputElement.getBoundingClientRect();
		// サジェスターの位置を入力欄の上に調整する
		suggester.style.left = `${rect.left}px`;
		suggester.style.bottom = `${window.innerHeight - rect.top}px`;
		suggester.style.width = `${rect.width}px`;
		suggester.style.display = 'block';
	}

	// サジェストを非表示にする関数
	function hideSuggestions() {
		// 本関数は、サジェストUIを非表示状態にする
		if (suggester) {
			suggester.style.display = 'none';
		}
		selectedIndex = 0;
	}

	// 選択されたプロンプトを入力欄に挿入する関数
	function insertPrompt(inputElement, prompt) {
		// 本関数は、指定されたプロンプトを入力欄に設定する
		inputElement.focus();
		document.execCommand('selectAll', false, null);
		document.execCommand('insertText', false, prompt);
		hideSuggestions();
	}

	// 矢印キーでの選択状態を更新する関数
	function updateSelection(filteredPrompts) {
		// 本関数は、キーボード操作による選択状態を更新する
		if (!suggester || suggester.style.display === 'none') return;

		Array.from(suggester.children).forEach((item, index) => {
			if (index === selectedIndex) {
				item.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
			} else {
				item.style.backgroundColor = 'transparent';
			}
		});
	}

	// キー入力のイベントを監視する関数
	function handleKeyDown(e) {
		// 本関数は、キーボードからの入力を監視し、特定のキーに応じた処理を実行する
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

	// メインの処理：Geminiの入力欄を探してイベントリスナーを設定
	function initialize() {
		// 本関数は、監視対象となる入力欄を特定し、イベントリスナーを設定する
		const inputElement = document.querySelector(GEMINI_INPUT_SELECTOR);
		if (inputElement && !inputElement.dataset.promptHandlerAttached) {
			currentInput = inputElement;
			inputElement.dataset.promptHandlerAttached = 'true'; // 二重登録防止

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
			console.log('Gemini Prompt Suggester initialized (v1.1).');
		}
	}

	// ページが読み込まれたときや、動的に変化したときに初期化処理を試みる
	setInterval(initialize, 1000);

})();
