import { Core, Store, useStore } from '@tomic/react';
import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  useCreateAndNavigate,
  CreateAndNavigate,
} from '../../../hooks/useCreateAndNavigate';
import { AppSettings, useSettings } from '../../../helpers/AppSettings';
import { newURL } from '../../../helpers/navigation';
import { useNavigateWithTransition } from '../../../hooks/useNavigateWithTransition';

export interface CustomResourceDialogProps {
  parent: string;
  onClose: () => void;
}

export type BasicInstanceHandler = (
  parent: string,
  createAndNavigate: CreateAndNavigate,
  context: {
    store: Store;
    settings: AppSettings;
  },
) => Promise<void>;

interface NewResourceUIContext {
  showNewResourceUI: (classType: string, parent: string) => void;
}

const dialogs = new Map<string, FC<CustomResourceDialogProps>>();
const basicNewInstanceHandlers = new Map<string, BasicInstanceHandler>();

export function useNewResourceUI() {
  const { showNewResourceUI } = useContext(NewResourceUIContext);

  return showNewResourceUI;
}

export const registerNewResourceDialog = (
  classSubject: string,
  component: FC<CustomResourceDialogProps>,
) => {
  dialogs.set(classSubject, component);
};

export const registerBasicInstanceHandler = (
  classSubject: string,
  handler: BasicInstanceHandler,
) => {
  basicNewInstanceHandlers.set(classSubject, handler);
};

const NewResourceUIContext = createContext<NewResourceUIContext>({
  showNewResourceUI: () => undefined,
});

export function NewResourceUIProvider({ children }: PropsWithChildren) {
  const store = useStore();
  const settings = useSettings();
  const createAndNavigate = useCreateAndNavigate();
  const [Dialog, setDialog] = useState<JSX.Element | undefined>(undefined);
  const navigate = useNavigateWithTransition();

  const showNewResourceUI = useCallback(async (isA: string, parent: string) => {
    // Show a dialog if one is registered for the given class
    if (dialogs.has(isA)) {
      const onClose = () => {
        setDialog(undefined);
      };

      const Comp = dialogs.get(isA)!;
      setDialog(<Comp parent={parent} onClose={onClose} />);

      return;
    }

    // If a basicInstanceHandler is registered for the class, create a resource of the given class with some default values.
    if (basicNewInstanceHandlers.has(isA)) {
      basicNewInstanceHandlers.get(isA)?.(parent, createAndNavigate, {
        store,
        settings,
      });

      return;
    }

    // Default behaviour. Navigate to a new resource form for the given class.
    const classResource = await store.getResourceAsync<Core.Class>(isA);
    navigate(
      newURL(isA, parent, store.createSubject(classResource.props.shortname)),
    );
  }, []);

  const context = useMemo(
    () => ({
      showNewResourceUI,
    }),
    [showNewResourceUI],
  );

  return (
    <NewResourceUIContext.Provider value={context}>
      {children}
      {Dialog}
    </NewResourceUIContext.Provider>
  );
}
