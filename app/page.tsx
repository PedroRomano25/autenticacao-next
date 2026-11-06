import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold">Sistema de autenticação</h1>
          <CardDescription>
            Projeto local de estudo. As telas de acesso chegam nas próximas etapas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Por enquanto, esta é a página inicial.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="min-h-11 w-full">
            <Link href={ROUTES.HOME}>Ir para o início</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
