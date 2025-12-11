/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require("nativewind/preset")],
    content: ["./App.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                },
                medical: {
                    green: '#10b981',
                    red: '#ef4444',
                    warning: '#f59e0b',
                    neutral: '#64748b'
                }
            },
            fontFamily: {
                sans: ['Inter', 'System', 'sans-serif'],
            }
        }
    },
    plugins: [],
}
