import { getSession } from "@/lib/auth";
import PostDetailClient from "./PostDetailClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PostPage({ params }: Props) {
  const session = await getSession();
  const { id } = await params;

  return (
    <PostDetailClient
      postId={id}
      currentUserId={session?.sub}
      currentUsername={session?.username}
      authorId={session?.sub ?? ""}
      isAdmin={session?.role === "ADMIN"}
    />
  );
}
