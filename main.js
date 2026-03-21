document.addEventListener('DOMContentLoaded', () => {
    const yearNode = document.getElementById('current-year');
    const faqItems = document.querySelectorAll('.faq-item');
    const courseTabs = document.querySelectorAll('.course-tab');
    const coursePanels = document.querySelectorAll('.course-panel');

    if (yearNode) {
        yearNode.textContent = String(new Date().getFullYear());
    }

    faqItems.forEach((item) => {
        const button = item.querySelector('.faq-question');
        if (!button) {
            return;
        }

        button.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            faqItems.forEach((entry) => {
                entry.classList.remove('active');
                const question = entry.querySelector('.faq-question');
                if (question) {
                    question.setAttribute('aria-expanded', 'false');
                }
            });

            if (!isActive) {
                item.classList.add('active');
                button.setAttribute('aria-expanded', 'true');
            }
        });
    });

    courseTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            courseTabs.forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });

            coursePanels.forEach((panel) => {
                panel.classList.remove('active');
            });

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const activePanel = document.querySelector(`.course-panel[data-panel="${tabName}"]`);
            if (activePanel) {
                activePanel.classList.add('active');
            }
        });
    });
});
