import ProfileCommunitiesList from "@/components/profile/ProfileCommunitiesList";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ProfileCommunitiesPage({ params }: Props) {
  const { username } = await params;

  return <ProfileCommunitiesList key={username} username={username} />;
}
