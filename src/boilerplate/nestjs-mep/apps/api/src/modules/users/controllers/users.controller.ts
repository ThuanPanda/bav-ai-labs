import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, Serialize } from '@prowerbdigital/common';

import { CreateUserCommand, DeleteUserCommand, UpdateUserCommand } from '../commands';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from '../dtos';
import { GetUserQuery, GetUsersQuery } from '../queries';
import { MutateUserResponse, UserOffsetListResponse, UserResponse } from '../responses';

/**
 * HTTP entry point for the User module. Dispatches to the bus only — no business logic.
 * Handlers return plain objects; `@Serialize` shapes them and `ResponseInterceptor` builds the
 * final envelope.
 */
@Controller({ version: '1', path: 'users' })
@ApiTags('Users')
export class UsersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('list')
  @ApiOperation({ summary: 'List users — page paginated' })
  @ApiSuccessResponse(UserOffsetListResponse)
  @Serialize(UserOffsetListResponse)
  async getUsers(@Query() query: GetUsersDto) {
    const { data, pagination } = await this.queryBus.execute(new GetUsersQuery(query));
    return { items: data, pagination };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiSuccessResponse(UserResponse)
  @Serialize(UserResponse)
  async getUser(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiSuccessResponse(MutateUserResponse)
  @Serialize(MutateUserResponse)
  async createUser(@Body() body: CreateUserDto) {
    const id = await this.commandBus.execute(new CreateUserCommand(body));
    return { id };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiSuccessResponse(MutateUserResponse)
  @Serialize(MutateUserResponse)
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    const updatedId = await this.commandBus.execute(new UpdateUserCommand({ id, ...body }));
    return { id: updatedId };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteUserCommand({ id }));
    return { success: true };
  }
}
