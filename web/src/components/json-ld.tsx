/**
 * Renders a JSON-LD <script> tag. `data` is our own structured-data object
 * (never user input), but we defensively escape `<` so a future string
 * containing `</script>` can't break out of the script element.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
