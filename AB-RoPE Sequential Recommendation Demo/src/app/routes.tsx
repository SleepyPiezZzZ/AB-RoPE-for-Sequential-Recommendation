import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Simulator } from './pages/Simulator';
import { XRayVision } from './pages/XRayVision';
import { ModelLab } from './pages/ModelLab';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Simulator },
      { path: 'xray', Component: XRayVision },
      { path: 'modellab', Component: ModelLab },
    ],
  },
]);
