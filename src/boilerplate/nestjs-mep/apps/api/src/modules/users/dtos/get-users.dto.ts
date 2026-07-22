import { OffsetPaginationDto } from '@prowerbdigital/common';

/** Query params for the page-paginated user list. Inherits `page`, `limit`, `search`. */
export class GetUsersDto extends OffsetPaginationDto {}
