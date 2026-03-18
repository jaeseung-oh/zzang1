document.addEventListener('DOMContentLoaded', () => {
    const lottoNumbersContainer = document.querySelector('.lotto-numbers');
    const generateBtn = document.getElementById('generate-btn');

    const generateLottoNumbers = () => {
        const numbers = new Set();
        while (numbers.size < 6) {
            const randomNumber = Math.floor(Math.random() * 45) + 1;
            numbers.add(randomNumber);
        }
        return Array.from(numbers).sort((a, b) => a - b);
    };

    const displayNumbers = (numbers) => {
        lottoNumbersContainer.innerHTML = '';
        numbers.forEach(number => {
            const numberElement = document.createElement('div');
            numberElement.classList.add('lotto-number');
            numberElement.textContent = number;
            lottoNumbersContainer.appendChild(numberElement);
        });
    };

    generateBtn.addEventListener('click', () => {
        const newNumbers = generateLottoNumbers();
        displayNumbers(newNumbers);
    });

    // Initial generation
    const initialNumbers = generateLottoNumbers();
    displayNumbers(initialNumbers);
});
