document.addEventListener('DOMContentLoaded', () => {
    const yearNode = document.getElementById('current-year');
    const faqItems = document.querySelectorAll('.faq-item');

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
});
