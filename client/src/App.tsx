import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import VideoMaker from "./pages/VideoMaker";
import CopyWriter from "./pages/CopyWriter";
import ImageEditor from "./pages/ImageEditor";
import FeedbackBoard from "./pages/FeedbackBoard";
import Layout from "./components/Layout";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/video" component={VideoMaker} />
      <Route path="/copy" component={CopyWriter} />
      <Route path="/image" component={ImageEditor} />
      <Route path="/feedback" component={FeedbackBoard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            toastOptions={{
              style: {
                background: 'oklch(0.14 0.005 60)',
                border: '1px solid oklch(0.72 0.08 75 / 30%)',
                color: 'oklch(0.92 0.01 80)',
              },
            }}
          />
          <Layout>
            <Router />
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
