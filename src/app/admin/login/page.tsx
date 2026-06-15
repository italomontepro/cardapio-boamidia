import { login } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou senha invalidos.',
  not_an_admin: 'Este usuario nao tem acesso administrativo.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login Administrativo</CardTitle>
          <CardDescription>
            Acesse o painel de administracao da Boa Midia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-2.5 py-2 text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="mt-2 w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
