import { useEffect, useState } from 'react';
import { OptionMenuModal, type OptionMenuItem } from './OptionMenuModal';
import {
  getMediaSourcePickerPending,
  resolveMediaSourceChoice,
  subscribeMediaSourcePicker,
} from '../lib/mediaSourcePickerBridge';

/** Renders the custom photo-library / files picker (replaces Alert.alert source menus). */
export function MediaSourcePickerHost() {
  const [, bump] = useState(0);
  const pending = getMediaSourcePickerPending();

  useEffect(() => subscribeMediaSourcePicker(() => bump((n) => n + 1)), []);

  const options: OptionMenuItem[] =
    pending?.options.map((o) => ({
      key: o.key,
      label: o.label,
      onPress: () => resolveMediaSourceChoice(o.key),
    })) ?? [];

  return (
    <OptionMenuModal
      visible={Boolean(pending)}
      title={pending?.title ?? 'Choose source'}
      options={options}
      onClose={() => resolveMediaSourceChoice(null)}
    />
  );
}
