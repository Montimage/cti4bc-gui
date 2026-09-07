// Shared logic for overlaying a sharing-strategy template onto an event.
//
// Shapes to keep in mind:
//   event.Attribute    -> object keyed by category (AWARE4BC / RISK4BC / SOAR4BC),
//                         each value an array of attributes
//   template.Attribute -> flat array, matched against event attributes by `type`
// Template scalars come from StrategyModal as strings ("true"/"false") and default
// to "", so they need coercion and an "was it actually filled in?" check.

const BOOLEAN_FIELDS = ['published', 'locked', 'disable_correlation', 'proposal_email_lock'];

const asBool = (value) => value === true || value === 'true';
const isSet = (value) => value !== undefined && value !== null && value !== '';

export function applyStrategyTemplate(prevEvent, template) {
    if (!prevEvent || !template) {
        return prevEvent;
    }

    const templateAttrs = Array.isArray(template.Attribute) ? template.Attribute : [];
    const prevAttrs = prevEvent.Attribute || {};

    const Attribute = Object.keys(prevAttrs).reduce((acc, category) => {
        const list = Array.isArray(prevAttrs[category]) ? prevAttrs[category] : [];
        acc[category] = list.map(attr => {
            const templateAttr = templateAttrs.find(tAttr => tAttr.type === attr.type);
            if (!templateAttr) {
                return attr;
            }
            return {
                ...attr,
                action: templateAttr.action,
                to_ids: 'to_ids' in templateAttr ? asBool(templateAttr.to_ids) : attr.to_ids,
            };
        });
        return acc;
    }, {});

    // Only overlay template fields that were actually filled in, so an empty
    // template field never wipes a real event value (e.g. distribution: "").
    const { Attribute: _templateAttribute, ...fields } = template;
    const overlay = {};
    Object.entries(fields).forEach(([key, value]) => {
        if (!isSet(value)) {
            return;
        }
        overlay[key] = BOOLEAN_FIELDS.includes(key) ? asBool(value) : value;
    });

    return {
        ...prevEvent,
        ...overlay,
        Attribute,
    };
}

export default applyStrategyTemplate;
