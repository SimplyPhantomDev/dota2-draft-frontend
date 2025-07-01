import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'
import HeroList from "./pages/HeroList";

function App() {
  return (
  <DndProvider backend={HTML5Backend}>
    <HeroList />
  </DndProvider>
  );
}

export default App;
