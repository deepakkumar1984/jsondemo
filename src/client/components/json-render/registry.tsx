import type { ComponentRegistry } from '@json-render/react';

// Import all wrapper components
import { AlertWrapper } from './wrappers/AlertWrapper';
import { AvatarWrapper } from './wrappers/AvatarWrapper';
import { BadgeWrapper } from './wrappers/BadgeWrapper';
import { ButtonWrapper } from './wrappers/ButtonWrapper';
import { CardWrapper } from './wrappers/CardWrapper';
import { DataTableWrapper } from './wrappers/DataTableWrapper';
import { DateFieldWrapper } from './wrappers/DateFieldWrapper';
import { DetailRowWrapper } from './wrappers/DetailRowWrapper';
import { DetailSectionWrapper } from './wrappers/DetailSectionWrapper';
import { DividerWrapper } from './wrappers/DividerWrapper';
import { FormWrapper } from './wrappers/FormWrapper';
import { GridWrapper } from './wrappers/GridWrapper';
import { HeadingWrapper } from './wrappers/HeadingWrapper';
import { PageHeaderWrapper } from './wrappers/PageHeaderWrapper';
import { SelectFieldWrapper } from './wrappers/SelectFieldWrapper';
import { StackWrapper } from './wrappers/StackWrapper';
import { StatCardWrapper } from './wrappers/StatCardWrapper';
import { TabPanelWrapper } from './wrappers/TabPanelWrapper';
import { TabsWrapper } from './wrappers/TabsWrapper';
import { TextAreaWrapper } from './wrappers/TextAreaWrapper';
import { TextFieldWrapper } from './wrappers/TextFieldWrapper';
import { TextWrapper } from './wrappers/TextWrapper';

/**
 * Component registry mapping component type names to wrapper components
 * This registry is used by json-render's Renderer to lookup and render components
 */
export const componentRegistry: ComponentRegistry = {
  Alert: AlertWrapper,
  Avatar: AvatarWrapper,
  Badge: BadgeWrapper,
  Button: ButtonWrapper,
  Card: CardWrapper,
  DataTable: DataTableWrapper,
  DateField: DateFieldWrapper,
  DetailRow: DetailRowWrapper,
  DetailSection: DetailSectionWrapper,
  Divider: DividerWrapper,
  Form: FormWrapper,
  Grid: GridWrapper,
  Heading: HeadingWrapper,
  PageHeader: PageHeaderWrapper,
  SelectField: SelectFieldWrapper,
  Stack: StackWrapper,
  StatCard: StatCardWrapper,
  TabPanel: TabPanelWrapper,
  Tabs: TabsWrapper,
  TextArea: TextAreaWrapper,
  TextField: TextFieldWrapper,
  Text: TextWrapper,
};
