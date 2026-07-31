import BookingFlow from './BookingFlow'

export const dynamic = 'force-dynamic'

export default function Page({ params }: { params: { slug: string } }) {
  return <BookingFlow slug={params.slug} />
}
