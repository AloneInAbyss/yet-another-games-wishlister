import { HomeLinks, MessagePage } from "@/components/MessagePage";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Página não encontrada · YAGW" };

export default async function NotFound() {
  const user = await getCurrentUser();
  return (
    <MessagePage title="Página não encontrada" actions={<HomeLinks username={user?.username ?? null} />}>
      <p>O endereço pode estar errado ou a página não existe mais.</p>
    </MessagePage>
  );
}
