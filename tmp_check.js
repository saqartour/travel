
        const ADMIN_PASSWORD = 'Sakartvelo2026!';

        let users = JSON.parse(localStorage.getItem('gtf_users')) || [];
        let currentUser = JSON.parse(localStorage.getItem('gtf_user')) || null;
        let threads = JSON.parse(localStorage.getItem('gtf_threads')) || [];
        let chatMessages = JSON.parse(localStorage.getItem('gtf_chat')) || [];
        let currentChatCategory = 'General';
        let threadFilterCategory = 'all';
        let adminLogged = localStorage.getItem('gtf_admin') === 'true';

        const categoryLabels = {
            General: 'General',
            Tbilisi: 'Tbilisi 🇬🇪',
            Batumi: 'Batumi 🌊',
            Mountains: 'Caucasus 🏔️',
            'Hotels & Stays': 'Hotels & Stays',
            Armenia: 'Armenia 🇦🇲',
            Azerbaijan: 'Azerbaijan 🇦🇿'
        };

        const chatChannel = new BroadcastChannel('gtf_live_chat');

        function saveAll() {
            localStorage.setItem('gtf_users', JSON.stringify(users));
            localStorage.setItem('gtf_user', JSON.stringify(currentUser));
            localStorage.setItem('gtf_threads', JSON.stringify(threads));
            localStorage.setItem('gtf_chat', JSON.stringify(chatMessages));
            localStorage.setItem('gtf_admin', adminLogged ? 'true' : 'false');
            localStorage.setItem('gtf_theme', document.body.dataset.theme || 'dark');
        }

        function setTheme(theme) {
            document.body.dataset.theme = theme;
            const icon = document.querySelector('#theme-toggle i');
            if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            if (theme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }
            saveAll();
        }

        function toggleTheme() {
            setTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
        }

        const translations = {
            en: {
                siteName: 'Georgia Travel',
                siteTagline: 'Sakartvelo premium hub',
                navForum: 'Forum',
                navLiveChat: 'Live Chat',
                navWallet: 'Wallet',
                navProfile: 'Profile',
                navAdmin: 'Admin',
                heroBadge: 'Georgia Travel AI Hub',
                heroTitle: 'Future-ready travel community for expert visitors.',
                heroSubtext: 'Join verified discussions, discover premium tips, and earn rewards instantly with referrals.',
                heroStartThread: 'Start a thread',
                heroLoginButton: 'Quick login',
                heroRegisterButton: 'Create account',
                heroExploreRegion: 'Explore region',
                heroMenuForum: 'Forum',
                heroMenuTbilisi: 'Tbilisi 🇬🇪',
                heroMenuBatumi: 'Batumi 🌊',
                heroMenuMountains: 'Caucasus 🏔️',
                heroStatExplorers: 'Active explorers',
                heroStatExplorersDesc: 'Realtime engagement across Georgia regions.',
                heroReferralBonus: 'Referral bonus',
                heroReferralBonusDesc: 'Boost your score when friends join with your code.',
                heroVerifiedThreads: 'Verified threads',
                heroVerifiedThreadsDesc: 'Curated expert discussions for smart travelers.'
            },
            ka: {
                siteName: 'საქართველო ტრაველი',
                siteTagline: 'საკარტველოს პრემიუმ ცენტრი',
                navForum: 'ფორუმი',
                navLiveChat: 'ცოცხალი ჩატი',
                navWallet: 'საფულე',
                navProfile: 'პროფილი',
                navAdmin: 'ადმინი',
                heroBadge: 'საქართველო ტრაველი AI ჰაბი',
                heroTitle: 'მომავლის მოგზაურობის საზოგადოება ექსპერტებისთვის.',
                heroSubtext: 'დაემატეთ დისკუსიებს, აღმოაჩინეთ პრემიუმ რჩევები და მიიღეთ ბონუსები რეფერალებით.',
                heroStartThread: 'შექმენე თემა',
                heroLoginButton: 'შეყვანა',
                heroRegisterButton: 'ანგარიშის შექმნა',
                heroExploreRegion: 'რეგიონის არჩევა',
                heroMenuForum: 'ფორუმი',
                heroMenuTbilisi: 'თბილისი 🇬🇪',
                heroMenuBatumi: 'ბათუმი 🌊',
                heroMenuMountains: 'კავკასიონი 🏔️',
                heroStatExplorers: 'აქტიური გამგზავრები',
                heroStatExplorersDesc: 'რეალურ დროში ჩართული რეგიონალური აქტივობა.',
                heroReferralBonus: 'რეფერალის ბონუსი',
                heroReferralBonusDesc: 'მიიღეთ +30 ქულა, როცა მეგობრები დარეგისტრირდებიან თქვენს კოდზე.',
                heroVerifiedThreads: 'ვერიფიცირებული თემები',
                heroVerifiedThreadsDesc: 'კურირებული ექსპერტული დისკუსიები ჭკვიანი მოგზაურებისთვის.'
            },
            ru: {
                siteName: 'Грузия Трэвел',
                siteTagline: 'Премиум центр Сакартвело',
                navForum: 'Форум',
                navLiveChat: 'Чат',
                navWallet: 'Кошелек',
                navProfile: 'Профиль',
                navAdmin: 'Админ',
                heroBadge: 'Грузия Трэвел AI Хаб',
                heroTitle: 'Сообщество путешествий нового поколения.',
                heroSubtext: 'Присоединяйтесь к проверенным обсуждениям, находите премиум советы и зарабатывайте бонусы за рефералов.',
                heroStartThread: 'Создать тему',
                heroLoginButton: 'Войти',
                heroRegisterButton: 'Регистрация',
                heroExploreRegion: 'Выбрать регион',
                heroMenuForum: 'Форум',
                heroMenuTbilisi: 'Тбилиси 🇬🇪',
                heroMenuBatumi: 'Батуми 🌊',
                heroMenuMountains: 'Кавказ 🏔️',
                heroStatExplorers: 'Активные путешественники',
                heroStatExplorersDesc: 'Общение в реальном времени по регионам Грузии.',
                heroReferralBonus: 'Реферальный бонус',
                heroReferralBonusDesc: 'Получайте +30 очков, когда друзья регистрируются по вашему коду.',
                heroVerifiedThreads: 'Проверенные темы',
                heroVerifiedThreadsDesc: 'Кураторские экспертные дискуссии для умных путешественников.'
            },
            ar: {
                siteName: 'جيورجيا ترافيل',
                siteTagline: 'المركز المتميز لساكارتفيلو',
                navForum: 'المنتدى',
                navLiveChat: 'الدردشة',
                navWallet: 'المحفظة',
                navProfile: 'الملف الشخصي',
                navAdmin: 'الإدارة',
                heroBadge: 'محور سفر جورجيا AI',
                heroTitle: 'مجتمع سفر مستقبلية للزوار الخبراء.',
                heroSubtext: 'انضم إلى المناقشات الموثوقة، واكتشف نصائح مميزة، واحصل على مكافآت عند الإحالات.',
                heroStartThread: 'ابدأ موضوعاً',
                heroLoginButton: 'تسجيل الدخول',
                heroRegisterButton: 'أنشئ حسابًا',
                heroExploreRegion: 'اختر المنطقة',
                heroMenuForum: 'المنتدى',
                heroMenuTbilisi: 'تبليسي 🇬🇪',
                heroMenuBatumi: 'باتومي 🌊',
                heroMenuMountains: 'القوقاز 🏔️',
                heroStatExplorers: 'المستكشفون النشطون',
                heroStatExplorersDesc: 'التفاعل في الوقت الحقيقي عبر مناطق جورجيا.',
                heroReferralBonus: 'مكافأة الإحالة',
                heroReferralBonusDesc: 'احصل على +30 نقطة عندما ينضم أصدقاؤك باستخدام الكود الخاص بك.',
                heroVerifiedThreads: 'المواضيع المعتمدة',
                heroVerifiedThreadsDesc: 'نقاشات خبراء مميزة للمسافرين الأذكياء.'
            }
        };

        function setLanguage(lang) {
            if (!translations[lang]) lang = 'en';
            localStorage.setItem('gtf_language', lang);
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            const t = translations[lang];

            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };

            setText('site-name', t.siteName);
            setText('site-tagline', t.siteTagline);
            setText('nav-forum', t.navForum);
            setText('nav-live-chat', t.navLiveChat);
            setText('nav-wallet', t.navWallet);
            setText('nav-profile', t.navProfile);
            setText('nav-admin', t.navAdmin);
            setText('hero-badge', t.heroBadge);
            setText('hero-title', t.heroTitle);
            setText('hero-subtext', t.heroSubtext);
            setText('hero-start-thread', t.heroStartThread);
            setText('hero-login-button', t.heroLoginButton);
            setText('hero-register-button', t.heroRegisterButton);
            setText('hero-explore-region-text', t.heroExploreRegion);
            setText('hero-menu-forum', t.heroMenuForum);
            setText('hero-menu-tbilisi', t.heroMenuTbilisi);
            setText('hero-menu-batumi', t.heroMenuBatumi);
            setText('hero-menu-mountains', t.heroMenuMountains);
            setText('hero-stat-explorers', t.heroStatExplorers);
            setText('hero-stat-explorers-desc', t.heroStatExplorersDesc);
            setText('hero-referral-bonus', t.heroReferralBonus);
            setText('hero-referral-bonus-desc', t.heroReferralBonusDesc);
            setText('hero-verified-threads', t.heroVerifiedThreads);
            setText('hero-verified-threads-desc', t.heroVerifiedThreadsDesc);

            const select = document.getElementById('language-select');
            if (select) select.value = lang;
        }

        function toggleDropdown(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('hidden');
        }

        function generateReferralCode() {
            return 'GTF' + Math.random().toString(36).slice(2, 8).toUpperCase();
        }

        function generateVerificationCode() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        }

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function getUserByReferralCode(code) {
            if (!code) return null;
            return users.find(user => user.referralCode === code.trim().toUpperCase());
        }

        function syncCurrentUserToUsers() {
            if (!currentUser) return;
            const existing = users.find(u => u.id === currentUser.id);
            if (existing) {
                Object.assign(existing, currentUser);
            } else {
                users.push(currentUser);
            }
            saveAll();
        }

        function getReferralCount() {
            if (!currentUser) return 0;
            return users.filter(user => user.referredBy === currentUser.referralCode).length;
        }

        function openVerifyEmailModal() {
            if (!currentUser) return;
            const modal = document.getElementById('verify-email-modal');
            const codeHint = document.getElementById('verify-code-hint');
            const emailAddress = document.getElementById('verify-email-address');
            if (codeHint) codeHint.textContent = `Verification code: ${currentUser.emailVerificationCode}`;
            if (emailAddress) emailAddress.textContent = currentUser.email;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function showVerifyEmailModal() {
            openVerifyEmailModal();
        }

        function closeVerifyEmailModal() {
            const modal = document.getElementById('verify-email-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }

        function verifyEmailCode() {
            const code = document.getElementById('verification-code').value.trim();
            if (!code) return alert('Enter the verification code.');
            if (!currentUser) return;
            if (code !== currentUser.emailVerificationCode) return alert('Incorrect verification code.');
            currentUser.verifiedEmail = true;
            currentUser.emailVerificationCode = null;
            syncCurrentUserToUsers();
            saveAll();
            closeVerifyEmailModal();
            updateUserNav();
            renderProfile();
            alert('Email verified successfully. You now have complete access.');
        }

        function sendVerificationEmail() {
            if (!currentUser) return;
            currentUser.emailVerificationCode = generateVerificationCode();
            syncCurrentUserToUsers();
            saveAll();
            openVerifyEmailModal();
            alert('A verification code has been generated and is visible in the verification modal.');
        }

        function openPasswordResetModal() {
            document.getElementById('password-reset-modal').classList.remove('hidden');
            document.getElementById('password-reset-modal').classList.add('flex');
        }

        function closePasswordResetModal() {
            document.getElementById('password-reset-modal').classList.remove('flex');
            document.getElementById('password-reset-modal').classList.add('hidden');
        }

        function openPasswordResetCodeModal() {
            document.getElementById('password-reset-code-modal').classList.remove('hidden');
            document.getElementById('password-reset-code-modal').classList.add('flex');
        }

        function closePasswordResetCodeModal() {
            document.getElementById('password-reset-code-modal').classList.remove('flex');
            document.getElementById('password-reset-code-modal').classList.add('hidden');
        }

        function openChangePasswordModal() {
            closePasswordResetModal();
            closePasswordResetCodeModal();
            const modal = document.getElementById('change-password-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeChangePasswordModal() {
            const modal = document.getElementById('change-password-modal');
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }

        function sendPasswordResetCode() {
            const email = document.getElementById('reset-password-email').value.trim().toLowerCase();
            if (!email) return alert('Enter your email address.');
            const user = users.find(u => u.email.toLowerCase() === email);
            if (!user) return alert('Email address not found.');
            user.passwordResetCode = generateVerificationCode();
            syncCurrentUserToUsers();
            saveAll();
            const hint = document.getElementById('reset-code-hint');
            if (hint) hint.textContent = user.passwordResetCode;
            openPasswordResetCodeModal();
            alert('A reset code has been generated and displayed for demo purposes. Use it to reset your password.');
        }

        function verifyResetPasswordCode() {
            const code = document.getElementById('reset-password-code').value.trim();
            const password = document.getElementById('reset-new-password').value;
            const confirm = document.getElementById('reset-confirm-password').value;
            if (!code || !password || !confirm) return alert('Complete all password reset fields.');
            if (password !== confirm) return alert('Passwords do not match.');
            const user = users.find(u => u.passwordResetCode === code);
            if (!user) return alert('Invalid reset code.');
            user.password = password;
            user.passwordResetCode = null;
            syncCurrentUserToUsers();
            saveAll();
            closePasswordResetCodeModal();
            alert('Password reset successfully. You may now log in with your new password.');
        }

        function changePassword() {
            const currentPassword = document.getElementById('current-password').value;
            const password = document.getElementById('new-password').value;
            const confirm = document.getElementById('new-password-confirm').value;
            if (!currentUser) return alert('You must be logged in to change password.');
            if (!currentPassword || !password || !confirm) return alert('Complete all password fields.');
            if (currentPassword !== currentUser.password) return alert('Current password is incorrect.');
            if (password !== confirm) return alert('New passwords do not match.');
            currentUser.password = password;
            syncCurrentUserToUsers();
            saveAll();
            closeChangePasswordModal();
            alert('Your password has been updated successfully.');
        }

        function toggleTwoFactor() {
            if (!currentUser) return;
            currentUser.twoFactorEnabled = !currentUser.twoFactorEnabled;
            syncCurrentUserToUsers();
            saveAll();
            renderProfile();
            alert(`Two-factor authentication is now ${currentUser.twoFactorEnabled ? 'enabled' : 'disabled'}.`);
        }

        function openRegisterModal() {
            hideLoginModal();
            document.getElementById('register-modal').classList.remove('hidden');
            document.getElementById('register-modal').classList.add('flex');
        }

        function showRegisterModal() {
            openRegisterModal();
        }

        function hideRegisterModal() {
            document.getElementById('register-modal').classList.remove('flex');
            document.getElementById('register-modal').classList.add('hidden');
        }

        function showLoginModal() {
            hideRegisterModal();
            document.getElementById('login-modal').classList.remove('hidden');
            document.getElementById('login-modal').classList.add('flex');
        }

        function hideLoginModal() {
            document.getElementById('login-modal').classList.remove('flex');
            document.getElementById('login-modal').classList.add('hidden');
        }

        function openAdminLogin() {
            if (adminLogged) {
                showSection('admin');
                return;
            }
            document.getElementById('admin-login-modal').classList.remove('hidden');
            document.getElementById('admin-login-modal').classList.add('flex');
        }

        function closeAdminLogin() {
            document.getElementById('admin-login-modal').classList.remove('flex');
            document.getElementById('admin-login-modal').classList.add('hidden');
        }

        function registerUser() {
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const password = document.getElementById('reg-password').value;
            const passwordConfirm = document.getElementById('reg-password-confirm').value;
            const address = document.getElementById('reg-address').value.trim();
            const nationality = document.getElementById('reg-nationality').value;
            const referral = document.getElementById('reg-referral').value.trim();

            if (!username || !email || !password || !passwordConfirm || !address) return alert('Complete all registration fields.');
            if (!validateEmail(email)) return alert('Enter a valid email address.');
            if (password !== passwordConfirm) return alert('Passwords do not match.');
            if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) return alert('That username is already taken.');
            if (users.some(user => user.email.toLowerCase() === email.toLowerCase())) return alert('That email is already registered.');

            currentUser = {
                id: Date.now(),
                username,
                email,
                password,
                address,
                nationality,
                points: 50,
                wallet: 0,
                referralCode: generateReferralCode(),
                referredBy: referral ? referral.toUpperCase() : null,
                verifiedLevel: 1,
                verifiedEmail: false,
                twoFactorEnabled: false,
                registeredAt: new Date().toISOString(),
                emailVerificationCode: generateVerificationCode(),
                passwordResetCode: null
            };

            const referredUser = getUserByReferralCode(referral);
            if (referredUser && referredUser.id !== currentUser.id) {
                currentUser.points += 30;
                referredUser.points += 30;
                syncCurrentUserToUsers();
            } else {
                currentUser.referredBy = null;
            }

            syncCurrentUserToUsers();
            saveAll();
            hideRegisterModal();
            updateUserNav();
            renderProfile();
            renderWallet();
            openVerifyEmailModal();
        }

        function loginUser() {
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;
            if (!identifier || !password) return alert('Enter your username/email and password.');

            const user = users.find(user => (user.username.toLowerCase() === identifier.toLowerCase() || user.email.toLowerCase() === identifier.toLowerCase()) && user.password === password);
            if (!user) return alert('Invalid username/email or password.');

            currentUser = user;
            saveAll();
            hideLoginModal();
            updateUserNav();
            renderProfile();
            renderWallet();
            if (!currentUser.verifiedEmail) {
                showVerifyEmailModal();
                alert('Please verify your email to unlock full access.');
                return;
            }
            alert(`Welcome back, ${currentUser.username}!`);
        }

        function adminLogin() {
            const password = document.getElementById('admin-password').value;
            if (password !== ADMIN_PASSWORD) return alert('Incorrect admin password.');
            adminLogged = true;
            saveAll();
            closeAdminLogin();
            showSection('admin');
            renderAdminPanel();
        }

        function adminLogout() {
            adminLogged = false;
            saveAll();
            showSection('forum');
            alert('Admin logged out.');
        }

        function renderThreads() {
            const list = document.getElementById('threads-list');
            if (!list) return;

            const sortSelect = document.getElementById('sort-threads');
            const sort = sortSelect ? sortSelect.value : 'newest';
            let visibleThreads = threads.filter(thread => thread.status === 'approved');

            if (threadFilterCategory !== 'all') {
                visibleThreads = visibleThreads.filter(thread => thread.category === threadFilterCategory);
            }

            if (sort === 'points') {
                visibleThreads = visibleThreads.sort((a,b) => (b.points || 0) - (a.points || 0));
            } else if (sort === 'comments') {
                visibleThreads = visibleThreads.sort((a,b) => (b.comment_count || 0) - (a.comment_count || 0));
            } else {
                visibleThreads = visibleThreads.sort((a,b) => b.id - a.id);
            }

            if (visibleThreads.length === 0) {
                list.innerHTML = '<div class="p-8 text-[#7a9bb6]">No approved threads yet. Submit the first one!</div>';
                return;
            }

            list.innerHTML = visibleThreads.map(thread => `
                <div class="thread-card border-b border-white/10">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div class="text-xs uppercase tracking-[0.25em] text-[#7a9bb6]">${categoryLabels[thread.category] || thread.category}</div>
                            <h3 class="text-2xl font-semibold text-white mt-3">${thread.title}</h3>
                            <p class="text-[#a0b9da] mt-3">${thread.body || 'No description provided.'}</p>
                        </div>
                        <div class="text-sm text-[#7a9bb6] text-right">
                            <div>${thread.author}</div>
                            <div>${new Date(thread.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-3 mt-5 text-xs text-[#7a9bb6]">
                        <span class="rounded-full border border-white/10 bg-[#08182b]/90 px-3 py-1">${thread.points || 0} points</span>
                        <span class="rounded-full border border-white/10 bg-[#08182b]/90 px-3 py-1">${thread.comment_count || 0} comments</span>
                    </div>
                </div>
            `).join('');
        }

        function showCreateThreadModal() {
            if (!currentUser) {
                showLoginModal();
                return;
            }
            document.getElementById('create-thread-modal').classList.remove('hidden');
            document.getElementById('create-thread-modal').classList.add('flex');
        }

        function hideCreateThreadModal() {
            document.getElementById('create-thread-modal').classList.remove('flex');
            document.getElementById('create-thread-modal').classList.add('hidden');
        }

        function setThreadFilter(category) {
            threadFilterCategory = category;
            renderThreads();
        }

        function submitThread() {
            if (!currentUser) {
                showLoginModal();
                return;
            }
            const title = document.getElementById('thread-title').value.trim();
            const category = document.getElementById('thread-category').value;
            const body = document.getElementById('thread-body').value.trim();
            if (!title) return alert('Thread title is required.');

            threads.unshift({
                id: Date.now(),
                title,
                category,
                body,
                author: currentUser.username,
                points: 0,
                comment_count: 0,
                status: 'pending',
                created_at: new Date().toISOString()
            });
            saveAll();
            hideCreateThreadModal();
            alert('Thread submitted for admin review.');
            return;
        }

        function renderChatCategories() {
            const container = document.getElementById('chat-categories');
            const select = document.getElementById('chat-category-select');
            const categories = [
                { key: 'General', label: 'General' },
                { key: 'Tbilisi', label: 'Tbilisi 🇬🇪' },
                { key: 'Batumi', label: 'Batumi 🌊' },
                { key: 'Mountains', label: 'Caucasus 🏔️' },
                { key: 'Armenia', label: 'Armenia 🇦🇲' },
                { key: 'Azerbaijan', label: 'Azerbaijan 🇦🇿' }
            ];
            if (select) {
                select.innerHTML = categories.map(cat => `<option value="${cat.key}">${cat.label}</option>`).join('');
                select.value = currentChatCategory;
            }
            if (!container) return;
            container.innerHTML = categories.map(cat => `
                <button onclick="switchChatCategory('${cat.key}')" class="chat-pill px-4 py-2 rounded-full ${cat.key === currentChatCategory ? 'bg-[#5eead4]/20 text-[#e2f6ff] border-transparent shadow-[0_0_30px_rgba(94,234,212,0.15)]' : 'bg-[#071422]/95 text-[#a0b9da] border border-white/10'}">${cat.label}</button>
            `).join('');
        }

        function switchChatCategory(category) {
            currentChatCategory = category;
            renderChatCategories();
            renderChatMessages();
        }

        function renderChatMessages() {
            const container = document.getElementById('chat-messages');
            if (!container) return;
            const filtered = chatMessages.filter(msg => msg.category === currentChatCategory);
            if (filtered.length === 0) {
                container.innerHTML = '<div class="text-slate-500">No messages yet in this region. Start the conversation.</div>';
                return;
            }
            container.innerHTML = filtered.map(msg => {
                const isMine = currentUser && msg.username === currentUser.username;
                return `
                    <div class="flex ${isMine ? 'justify-end' : ''}">
                        <div class="max-w-[75%] ${isMine ? 'bg-[#5eead4]/90 text-slate-950' : 'bg-[#08182b]/95 border border-white/10 text-[#e2f6ff]'} rounded-[1.75rem] px-5 py-4 chat-bubble">
                            <div class="flex items-center justify-between gap-3 mb-2 text-xs ${isMine ? 'text-[#0f172a]' : 'text-[#7a9bb6]'}">
                                <span class="font-semibold">${msg.username}</span>
                                <span>${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div>${msg.message}</div>
                        </div>
                    </div>
                `;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }

        function sendChatMessage() {
            if (!currentUser) {
                showLoginModal();
                return;
            }
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (!message) return;
            const newMsg = {
                id: Date.now(),
                username: currentUser.username,
                message,
                category: currentChatCategory,
                timestamp: new Date().toISOString()
            };
            chatMessages.push(newMsg);
            saveAll();
            chatChannel.postMessage({ type: 'new_message', message: newMsg, category: currentChatCategory });
            renderChatMessages();
            input.value = '';
        }

        chatChannel.onmessage = event => {
            if (event.data.type === 'new_message') {
                chatMessages.push(event.data.message);
                saveAll();
                if (event.data.category === currentChatCategory) renderChatMessages();
            }
        };

        function renderWallet() {
            document.getElementById('wallet-balance').textContent = currentUser ? currentUser.wallet.toFixed(2) : '0.00';
            document.getElementById('points-balance').textContent = currentUser ? currentUser.points : '0';
            document.getElementById('verification-level').textContent = currentUser ? currentUser.verifiedLevel : '1';
        }

        function requestVerification() {
            if (!currentUser) {
                showLoginModal();
                return;
            }
            if (currentUser.verifiedLevel >= 2) return alert('You are already Level 2 verified.');
            if (currentUser.points < 120) return alert('Earn at least 120 points to unlock Level 2 verification.');
            currentUser.verifiedLevel = 2;
            syncCurrentUserToUsers();
            saveAll();
            renderWallet();
            alert('Congratulations! Your account is now Level 2 verified.');
        }

        function redeemFunds() {
            if (!currentUser) {
                showLoginModal();
                return;
            }
            const amount = parseFloat(document.getElementById('redeem-amount').value);
            if (!amount || amount <= 0) return alert('Enter a valid redemption amount.');
            if (currentUser.verifiedLevel < 2) return alert('You need Level 2 verification to redeem funds.');
            if (amount > currentUser.wallet) return alert('Insufficient wallet balance.');

            currentUser.wallet -= amount;
            currentUser.points += Math.ceil(amount / 5);
            syncCurrentUserToUsers();
            saveAll();
            renderWallet();
            updateUserNav();
            alert(`Redemption successful! $${amount.toFixed(2)} will be processed soon.`);
        }

        function updateUserNav() {
            const container = document.getElementById('user-nav');
            if (!container) return;
            if (!currentUser) {
                container.innerHTML = `<button onclick="showLoginModal()" class="btn-pill bg-[#5eead4] text-slate-950 px-6 py-2 rounded-full text-sm font-medium">Join Free</button>`;
                return;
            }
            const referralCount = getReferralCount();
            container.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="text-right cursor-pointer" onclick="showSection('profile')">
                        <div class="font-semibold">${currentUser.username}</div>
                        <div class="text-xs text-teal-700">${currentUser.points} pts · ${referralCount} referrals</div>
                    </div>
                    <button onclick="logout()" class="text-red-500 text-sm">Logout</button>
                </div>
            `;
        }

        function renderProfile() {
            const profile = document.getElementById('profile-content');
            if (!profile) return;
            if (!currentUser) {
                profile.innerHTML = `
                    <div class="text-slate-300">
                        <p class="text-lg font-semibold">Join Georgia Travel to unlock premium insights and referrals.</p>
                        <p class="mt-4">Use the register button to create your account and receive bonus points when a friend joins with your referral code.</p>
                    </div>
                `;
                return;
            }

            const referralCount = getReferralCount();
            const completionScore = Math.min(100, (currentUser.address ? 30 : 0) + (currentUser.nationality ? 15 : 0) + (currentUser.verifiedEmail ? 35 : 0) + (currentUser.referredBy ? 20 : 0));
            const twoFactorStatus = currentUser.twoFactorEnabled ? 'Active' : 'Disabled';
            profile.innerHTML = `
                <div class="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                    <div class="glass-card p-6">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="text-sm uppercase tracking-[0.2em] text-[#7a9bb6]">Profile Overview</div>
                                <h3 class="text-3xl font-semibold mt-4">${currentUser.username}</h3>
                                <div class="text-xs text-slate-400 mt-2">${currentUser.nationality || 'Nationality not set'}</div>
                            </div>
                            <div class="rounded-3xl bg-[#08182b]/95 p-4 text-center">
                                <div class="text-xs uppercase text-[#7a9bb6]">Completion</div>
                                <div class="text-3xl font-semibold mt-3 text-[#5eead4]">${completionScore}%</div>
                            </div>
                        </div>
                        <div class="mt-6 space-y-4">
                            <div class="rounded-3xl border border-white/10 bg-[#071422]/95 p-4">
                                <div class="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">
                                    <span>Email verified</span>
                                    <span class="${currentUser.verifiedEmail ? 'text-emerald-300' : 'text-amber-300'}">${currentUser.verifiedEmail ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                            <div class="rounded-3xl border border-white/10 bg-[#071422]/95 p-4">
                                <div class="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">
                                    <span>Address</span>
                                    <span class="text-slate-300">${currentUser.address || 'Not provided'}</span>
                                </div>
                            </div>
                            <div class="rounded-3xl border border-white/10 bg-[#071422]/95 p-4">
                                <div class="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">
                                    <span>2FA status</span>
                                    <span class="${currentUser.twoFactorEnabled ? 'text-emerald-300' : 'text-amber-300'}">${twoFactorStatus}</span>
                                </div>
                            </div>
                            <div class="progress-shell mt-2">
                                <div class="progress-fill" style="width: ${completionScore}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="glass-card p-6">
                        <div class="text-sm uppercase tracking-[0.2em] text-[#7a9bb6]">Account settings</div>
                        <div class="mt-4 space-y-4">
                            <div>
                                <label class="text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">Nationality</label>
                                <select id="profile-nationality" class="w-full custom-select mt-2 border border-white/10 rounded-full bg-[#071422]/90 px-4 py-3 text-white">
                                    <option value="Georgia">Georgia</option>
                                    <option value="Armenia">Armenia</option>
                                    <option value="Azerbaijan">Azerbaijan</option>
                                    <option value="Turkey">Turkey</option>
                                    <option value="Russia">Russia</option>
                                    <option value="EU">European Union</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">Address</label>
                                <input id="profile-address" type="text" value="${currentUser.address || ''}" class="w-full custom-select mt-2 border border-white/10 rounded-full bg-[#071422]/90 px-4 py-3 text-white">
                            </div>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="rounded-3xl border border-white/10 bg-[#071422]/95 p-4">
                                    <div class="text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">Points</div>
                                    <div class="text-4xl font-semibold mt-2 text-[#5eead4]">${currentUser.points}</div>
                                </div>
                                <div class="rounded-3xl border border-white/10 bg-[#071422]/95 p-4">
                                    <div class="text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">Wallet balance</div>
                                    <div class="text-4xl font-semibold mt-2">$${currentUser.wallet.toFixed(2)}</div>
                                </div>
                            </div>
                            <button onclick="saveProfileDetails()" class="w-full btn-pill bg-[#5eead4] text-slate-950 rounded-full px-6 py-3">Save profile</button>
                            <button onclick="openChangePasswordModal()" class="w-full btn-pill border border-white/10 rounded-full px-6 py-3 text-[#a0b9da]">Change password</button>
                            <button onclick="toggleTwoFactor()" class="w-full btn-pill ${currentUser.twoFactorEnabled ? 'bg-[#f59e0b]/80 text-slate-950' : 'border border-white/10 rounded-full bg-[#071422]/90 text-[#a0b9da]'} px-6 py-3">${currentUser.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}</button>
                            ${currentUser.verifiedEmail ? '' : '<button onclick="sendVerificationEmail()" class="w-full btn-pill border border-[#fbbf24] bg-[#fbbf2490] text-slate-950 rounded-full px-6 py-3">Verify email now</button>'}
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('profile-nationality').value = currentUser.nationality || 'Georgia';
        }

        function logout() {
            currentUser = null;
            localStorage.removeItem('gtf_user');
            updateUserNav();
            renderProfile();
            renderWallet();
            showSection('forum');
        }

        function saveProfileDetails() {
            if (!currentUser) return;
            const nationality = document.getElementById('profile-nationality').value;
            const address = document.getElementById('profile-address').value.trim();
            currentUser.nationality = nationality;
            currentUser.address = address;
            syncCurrentUserToUsers();
            saveAll();
            renderProfile();
            alert('Profile settings updated successfully.');
        }

        function toggleUserVerification(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            user.verifiedEmail = !user.verifiedEmail;
            syncCurrentUserToUsers();
            saveAll();
            renderAdminPanel();
        }

        function deleteUser(userId) {
            users = users.filter(user => user.id !== userId);
            if (currentUser && currentUser.id === userId) currentUser = null;
            saveAll();
            updateUserNav();
            renderAdminPanel();
        }

        function renderAdminPanel() {
            if (!adminLogged) return;
            const container = document.getElementById('admin-pending');
            const userSection = document.getElementById('admin-users');
            const pendingThreads = threads.filter(thread => thread.status === 'pending');
            const userCount = document.getElementById('admin-user-count');
            const verifiedCount = document.getElementById('admin-verified-count');

            if (userCount) userCount.textContent = users.length;
            if (verifiedCount) verifiedCount.textContent = users.filter(u => u.verifiedEmail).length;
            if (!container || !userSection) return;

            if (pendingThreads.length === 0) {
                container.innerHTML = '<div class="text-[#7a9bb6]">No pending threads at the moment.</div>';
            } else {
                container.innerHTML = pendingThreads.map(thread => `
                <div class="border border-white/10 rounded-[1.75rem] p-6 bg-[#071422]/90">
                    <div class="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                        <div>
                            <div class="text-xs uppercase tracking-[0.2em] text-[#7a9bb6]">${categoryLabels[thread.category] || thread.category}</div>
                            <h3 class="text-xl font-semibold mt-3 text-white">${thread.title}</h3>
                            <p class="text-[#a0b9da] mt-3">${thread.body}</p>
                            <p class="text-[#7a9bb6] text-sm mt-3">Submitted by ${thread.author} on ${new Date(thread.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <button onclick="reviewThread(${thread.id}, 'approved')" class="btn-pill bg-[#5eead4] text-slate-950 rounded-full px-5 py-3">Approve</button>
                            <button onclick="reviewThread(${thread.id}, 'rejected')" class="btn-pill bg-[#f87171]/15 text-[#ffebe4] rounded-full px-5 py-3">Reject</button>
                        </div>
                    </div>
                </div>
            `).join('');
            }
        }

        function reviewThread(id, action) {
            const index = threads.findIndex(thread => thread.id === id);
            if (index === -1) return;
            threads[index].status = action;
            if (action === 'approved') {
                threads[index].points = 10;
            }
            saveAll();
            renderAdminPanel();
            renderThreads();
        }

        function showSection(section) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const selected = document.getElementById(section);
            if (selected) selected.classList.add('active');

            document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('nav-active'));
            const activeNav = document.getElementById('nav-' + section);
            if (activeNav) activeNav.classList.add('nav-active');

            if (section === 'wallet') renderWallet();
            if (section === 'profile') renderProfile();
            if (section === 'admin') renderAdminPanel();
        }

        function init() {
            const savedTheme = localStorage.getItem('gtf_theme');
            if (savedTheme) {
                setTheme(savedTheme);
            } else {
                setTheme('dark');
            }
            const savedLanguage = localStorage.getItem('gtf_language') || 'en';
            setLanguage(savedLanguage);
            if (currentUser) syncCurrentUserToUsers();
            if (threads.length === 0) {
                threads = [
                    { id: 1, title: 'Best boutique hotels in Tbilisi old town?', category: 'Hotels & Stays', body: 'Looking for refined yet affordable stays with local character.', author: 'maria_travels', points: 18, comment_count: 3, status: 'approved', created_at: new Date().toISOString() },
                    { id: 2, title: 'Is Batumi good for winter travel?', category: 'Batumi', body: 'Curious about winter beach vibes and food scene.', author: 'travel_john', points: 0, comment_count: 0, status: 'pending', created_at: new Date().toISOString() }
                ];
                saveAll();
            }
            updateUserNav();
            renderChatCategories();
            renderThreads();
            renderChatMessages();
            renderWallet();
            renderProfile();
            if (adminLogged) renderAdminPanel();
        }

        window.onload = init;
    