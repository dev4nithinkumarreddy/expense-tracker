npx create-vite@latest temp-app --template react-ts
Get-ChildItem -Path temp-app -Force | Move-Item -Destination . -Force
Remove-Item temp-app -Force
npm install
npm install -D tailwindcss@3 postcss autoprefixer @types/node
npx tailwindcss init -p
npm install lucide-react recharts zustand clsx tailwind-merge date-fns react-router-dom
