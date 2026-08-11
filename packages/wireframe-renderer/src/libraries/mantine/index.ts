// The renderer wraps Mantine screens in this provider. It must come from the same module
// instance the components below resolve to, or the components look up a React context
// that was never populated and every Mantine screen fails to render.
export { MantineProvider } from "@mantine/core";

export {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
