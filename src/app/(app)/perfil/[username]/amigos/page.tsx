import ProfileFriendsList from "@/components/profile/ProfileFriendsList";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ProfileFriendsPage({ params }: Props) {
  const { username } = await params;

  return <ProfileFriendsList key={username} username={username} />;
}
