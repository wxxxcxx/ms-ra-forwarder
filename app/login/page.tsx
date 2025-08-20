import Login from "../../components/login";
export default async function Home() {
  return (
    <div className="grid size-full items-center justify-items-center min-h-screen pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col justify-center items-center sm:items-start">
        <Login />
      </main>
    </div>
  );
}
