export type NavigationItem = {
  title: string;
  href: string;
  target?: "_blank";
  children?: NavigationItem[];
};
