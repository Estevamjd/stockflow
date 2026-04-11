export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações do seu tenant</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-medium text-foreground">Perfil da Empresa</h2>
        <div className="grid gap-3">
          {["Nome da Empresa", "Email de Contato", "Telefone"].map((label) => (
            <div key={label}>
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <input className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder={`Informe o ${label.toLowerCase()}`} />
            </div>
          ))}
        </div>
        <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Salvar Alterações
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-medium text-foreground">Plano Atual</h2>
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">F</span>
          </div>
          <div>
            <p className="font-medium text-foreground">Plano Free</p>
            <p className="text-xs text-muted-foreground">Até 100 produtos · 500 vendas/mês · 1 usuário</p>
          </div>
          <button className="ml-auto px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Fazer Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
