(function() {
    let selectedTweet = null;
    let observer = null;
    const scrollOffset = 50;
    const distanceThreshold = 100;

    function selectTweet(tweet) {
        if (selectedTweet) {
            selectedTweet.style.outline = '';
        }
        selectedTweet = tweet;
        if (selectedTweet) {
            // リポスト済みかどうかを判定
            const retweetButton = selectedTweet.querySelector('[data-testid="unretweet"]');
            const isRetweeted = !!retweetButton;
            selectedTweet.style.outline = isRetweeted ? '2px solid red' : '2px solid blue';
            setTimeout(() => {
                const rect = selectedTweet.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo({
                    top: scrollTop + rect.top - scrollOffset,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    function navigateTweets(direction) {
        const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        if (tweets.length === 0) return;

        const firstVisibleTweet = getFirstVisibleTweet(tweets);

        if (!selectedTweet) {
            selectTweet(firstVisibleTweet || tweets[0]);
            return;
        }

        const currentIndex = tweets.indexOf(selectedTweet);
        if (currentIndex === -1) {
            selectTweet(firstVisibleTweet || tweets[0]);
            return;
        }

        const distance = Math.abs(currentIndex - tweets.indexOf(firstVisibleTweet));

        if (distance > distanceThreshold) {
            selectTweet(firstVisibleTweet);
            return;
        }

        let nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < tweets.length) {
            selectTweet(tweets[nextIndex]);
        }
    }

    function getFirstVisibleTweet(tweets) {
        for (const tweet of tweets) {
            const rect = tweet.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                return tweet;
            }
        }
        return tweets.length > 0 ? tweets[0] : null;
    }

    // --- いいね ---
    function performToggleLikeAction() {
        if (!selectedTweet) return;
        const likeButton = selectedTweet.querySelector('[data-testid*="like"]');
        if (!likeButton) {
            console.error("いいねボタンが見つかりません。");
            return;
        }
        likeButton.click();
    }

    // --- リツイート ---
    function performToggleRetweetAction() {
        if (!selectedTweet) return;
        const retweetButton = selectedTweet.querySelector('[data-testid*="retweet"]');
        if (!retweetButton) {
            console.error("リツイートボタンが見つかりません。");
            return;
        }
        retweetButton.click();

        const observer = new MutationObserver((mutations, obs) => {
            const confirmButton = document.querySelector('[data-testid="retweetConfirm"], [data-testid="unretweetConfirm"]');
            if (confirmButton) {
                confirmButton.click();
                obs.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
        }, 3000);
    }

    // --- ブロック操作 ---
    function performBlockAction() {
        if (!selectedTweet) return;

        const moreButton = selectedTweet.querySelector('[data-testid="caret"], [aria-label="More"]');
        if (!moreButton) {
            console.error('ブロック操作: 選択されたツイートで「もっと見る」ボタンが見つかりません。');
            return;
        }
        moreButton.click();

        const blockObserver = new MutationObserver((mutations, obs) => {
            let blockMenuItem = document.querySelector('[data-testid="block"][role="menuitem"]');

            if (blockMenuItem) {
                console.log("ブロックメニュー項目 (data-testid) が見つかりました。クリックします。", blockMenuItem);
                blockMenuItem.click();
                obs.disconnect();
            } else {
                const menuItems = document.querySelectorAll('[role="menuitem"]');
                for (const item of menuItems) {
                    if (item.textContent && item.textContent.includes('ブロック') && item.textContent.includes('@')) {
                        console.log("ブロックメニュー項目 (テキスト検索) が見つかりました。クリックします。", item);
                        item.click();
                        obs.disconnect();
                        return;
                    }
                }
            }
        });

        blockObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            if (blockObserver.takeRecords().length === 0 && !document.querySelector('[data-testid="block"][role="menuitem"]')) {
                // console.log("ブロック操作Observerがタイムアウトしました。メニュー項目が見つかりません。");
            }
            blockObserver.disconnect();
        }, 3000);
    }

    // --- タブ移動 ---
    function navigateTabs(direction) {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        if (tabs.length === 0) return;

        let activeTabIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
        if (activeTabIndex === -1) activeTabIndex = 0;

        let nextTabIndex = direction === 'up' ? activeTabIndex - 1 : activeTabIndex + 1;
        if (nextTabIndex < 0) nextTabIndex = tabs.length - 1;
        if (nextTabIndex >= tabs.length) nextTabIndex = 0;

        tabs[nextTabIndex].click();
    }

    // --- ▼▼▼▼▼ ここからが変更箇所です (1/2) ▼▼▼▼▼ ---
    // --- 一個前に戻る ---
    function goBack() {
        window.history.back();
    }
    // --- ▲▲▲▲▲ ここまでが変更箇所です (1/2) ▲▲▲▲▲ ---

    // --- ポストURLを新しいタブで開く、または引用先に移動する ---
    function openSelectedTweetUrl(isRightControl = false) {
        if (!selectedTweet) {
            console.error("選択されたポストがありません。");
            return;
        }

        const quoteContainer = selectedTweet.querySelector('div[tabindex="0"][role="link"]');
        
        if (isRightControl && quoteContainer) {
            console.log("引用ポストを検出しました。引用先に移動します。");
            quoteContainer.click();
            return;
        }

        console.log("通常のポストとして処理します。URLを新しいタブで開きます。");
        const timeElement = selectedTweet.querySelector('time');
        const tweetLinkElement = timeElement ? timeElement.closest('a[href*="/status/"]') : null;

        if (!tweetLinkElement || !tweetLinkElement.href) {
            console.error("ポストのURLが見つかりませんでした。");
            return;
        }
        
        console.log("ポストのURLを新しいタブで開きます:", tweetLinkElement.href);
        window.open(tweetLinkElement.href, '_blank');
    }

    // --- ポスト作成画面を開く ---
    function openTweetCompose() {
        let tweetButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
        if (!tweetButton) {
            console.log("サイドナビのポストボタン (data-testid) が見つかりません。代替手段を探します...");
            tweetButton = document.querySelector('a[aria-label="ポストする"], a[aria-label="Post"]');
            if (!tweetButton) {
                console.error("代替ポストボタン (aria-label) も見つかりません。");
                return;
            }
            console.log("代替ポストボタン (aria-label) が見つかりました。", tweetButton);
        } else {
            console.log("サイドナビのポストボタン (data-testid) が見つかりました。", tweetButton);
        }
        tweetButton.click();
    }

    // --- ポストボタン（作成画面内）をクリック ---
    function clickTweetButton() {
        let postButton = document.querySelector('[data-testid="tweetButton"]');
        if (!postButton) {
            console.log("作成画面のポストボタン (data-testid='tweetButton') が見つかりません。代替セレクタで試します。");
            postButton = document.querySelector('div[data-testid="tweetButtonDialog"] button[role="button"][aria-label*="Post"], div[data-testid="tweetButtonDialog"] button[role="button"][aria-label*="ポスト"]');
            if (postButton) {
                console.log("代替ポストボタン (role & aria-label) が見つかりました。", postButton);
            }
        }
        if (!postButton) {
            console.log("代替ポストボタン (role & aria-label) も見つかりません。テキスト内容で試します。");
            const buttons = document.querySelectorAll('div[data-testid="tweetButtonDialog"] button[role="button"]');
            for (const btn of buttons) {
                if (btn.textContent && (btn.textContent.trim() === "ポストする" || btn.textContent.trim() === "Post")) {
                    postButton = btn;
                    console.log("代替ポストボタン (テキスト内容) が見つかりました。", postButton);
                    break;
                }
            }
        }
        if (postButton) {
            if (!postButton.disabled) {
                console.log("ポストボタンをクリックします:", postButton);
                postButton.click();
            } else {
                console.log("ポストボタンが見つかりましたが、無効 (disabled) です。");
            }
        } else {
            console.log("作成画面のポストボタンが見つかりませんでした。");
        }
    }

    // --- インライン返信ボタンをクリック ---
    function clickTweetButtonInline() {
        let replyButton = document.querySelector('[data-testid="tweetButtonInline"]');
        if (!replyButton) {
            console.log("インライン返信ボタン (data-testid='tweetButtonInline') が見つかりません。代替セレクタで試します。");
            const replyContainers = document.querySelectorAll('div[data-testid="reply"], div[aria-labelledby^="detail-conversation"]');
            for (const container of replyContainers) {
                replyButton = container.querySelector('button[role="button"][data-testid="tweetButton"]');
                if (!replyButton) {
                    replyButton = Array.from(container.querySelectorAll('button[role="button"]'))
                        .find(btn => btn.textContent && (btn.textContent.trim() === "返信" || btn.textContent.trim() === "Reply"));
                }
                if (replyButton) {
                    console.log("代替インライン返信ボタンが見つかりました。", replyButton);
                    break;
                }
            }
        }
        if (replyButton) {
            if (!replyButton.disabled) {
                console.log("インライン返信ボタンをクリックします:", replyButton);
                replyButton.click();
            } else {
                console.log("インライン返信ボタンが見つかりましたが、無効 (disabled) です。");
            }
        } else {
            console.log("インライン返信ボタンが見つかりませんでした。");
        }
    }

    // --- DOM監視のセットアップ ---
    function setupObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(() => {
            if (selectedTweet && !document.body.contains(selectedTweet)) {
                if (selectedTweet.style) selectedTweet.style.outline = '';
                selectedTweet = null;
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // --- キーボードイベントリスナー ---
    document.addEventListener('keydown', (event) => {
        const targetTagName = event.target.tagName.toLowerCase();
        const isEditable = event.target.isContentEditable;
        if (targetTagName === 'input' || targetTagName === 'textarea' || isEditable) {
            if (event.altKey && event.key === 'Alt') {
            } else if (event.altKey) {
            } else {
                return;
            }
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            navigateTweets('up');
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            navigateTweets('down');
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            performToggleLikeAction();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            performToggleRetweetAction();
        } else if (event.key === 'PageUp') {
            event.preventDefault();
            navigateTabs('up');
        } else if (event.key === 'PageDown') {
            event.preventDefault();
            navigateTabs('down');
        } else if (event.key === 'b') {
            event.preventDefault();
            performBlockAction();
        } else if (event.key === 'Control' && event.location === 2) {
            event.preventDefault();
            openSelectedTweetUrl(true); // 右コントロールキーの場合
        // --- ▼▼▼▼▼ ここからが変更箇所です (2/2) ▼▼▼▼▼ ---
        } else if (event.key === 'Shift' && event.location === 2) {
            event.preventDefault();
            goBack(); // 右シフトキーで一個前に戻る
        // --- ▲▲▲▲▲ ここまでが変更箇所です (2/2) ▲▲▲▲▲ ---
        } else if (event.key === 'Alt' && event.location === 2) {
            console.log("右Altキーが押されました。ポスト/返信ボタンを探します...");
            event.preventDefault();
            clickTweetButtonInline();
            clickTweetButton();
        } else if (event.key === '<') {
            event.preventDefault();
            openTweetCompose();
        }
    });

    // 最初の監視を開始
    setupObserver();

    window.addEventListener('popstate', setupObserver);

    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            setupObserver();
            if (selectedTweet) {
                if (selectedTweet.style) selectedTweet.style.outline = '';
                selectedTweet = null;
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

})();