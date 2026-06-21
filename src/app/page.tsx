import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-lg font-bold tracking-tight text-foreground">
          Boa Mídia
        </span>
        <Link
          href="/admin/login"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-3xl mx-auto w-full">
        <div className="inline-block text-xs font-semibold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full mb-6">
          Agência de Social Media
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-foreground mb-6">
          Do Instagram direto
          <br />
          <span className="text-muted-foreground">para o WhatsApp.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-10">
          Transformamos seguidores em clientes. Nossa estratégia leva o público
          do feed até a conversa no WhatsApp — onde a venda acontece de verdade.
        </p>

        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 bg-foreground text-background px-7 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Acessar minha conta
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
          </svg>
        </Link>
      </main>

      {/* Features */}
      <section className="w-full max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            icon: "📲",
            title: "Conteúdo que converte",
            desc: "Posts, stories e reels pensados para gerar clique e curiosidade — não só curtida.",
          },
          {
            icon: "💬",
            title: "Do feed para o chat",
            desc: "CTAs estratégicos que movem o seguidor do Instagram para o WhatsApp da sua empresa.",
          },
          {
            icon: "💰",
            title: "Mais vendas, menos esforço",
            desc: "Você foca no seu negócio. A gente cuida da presença digital e do funil de vendas.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-card border border-border rounded-2xl p-6 text-left"
          >
            <div className="text-2xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground pb-8">
        © {new Date().getFullYear()} Boa Mídia · Todos os direitos reservados
      </footer>
    </div>
  );
}
