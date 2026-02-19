// This screen is never rendered directly — the FAB tab button
// intercepts the press and opens the AddVideo modal instead.
// This file is required by Expo Router for the route to exist.
import { Redirect } from 'expo-router';

export default function AddPlaceholder() {
  return <Redirect href="/(tabs)/" />;
}
