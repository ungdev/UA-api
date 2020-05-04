import { Entity, Column, ManyToOne, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsEmail } from 'class-validator';
import { UserType, Gender } from '../types';
import { DynamicEntity } from './dynamicEntity';
import { Team } from './team';
import Cart from './cart';
import { CartItem } from './cartItem';

@Entity({ name: 'users' })
export class User extends DynamicEntity {
  @Column({ length: 100, nullable: true }) // In case of visitor
  username: string;

  @Column({ length: 100 })
  firstname: string;

  @Column({ length: 100 })
  lastname: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserType })
  type: UserType;

  @Column({ nullable: true })
  permissions: string;

  @Column({ type: 'char', length: 4, nullable: true })
  place: string;

  @Column({ nullable: true })
  scannedAt: Date;

  @Column({ nullable: true })
  discordId: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @ManyToOne(() => Team, (team) => team.users, { onDelete: 'SET NULL' })
  team: Team;

  @ManyToOne(() => Team, (team) => team.users, { onDelete: 'SET NULL' })
  askingTeam: Team;

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @OneToMany(() => CartItem, (cartitem) => cartitem.forUser)
  cartItems: CartItem[];

  @BeforeInsert()
  @BeforeUpdate()
  checkUsernameConsistency() {
    if (this.type !== UserType.Visitor && !this.username) {
      throw new Error("Non visitor doesn't have a username !");
    } else if (this.type === UserType.Visitor && this.username) {
      throw new Error('Visitor has a username !');
    }
  }
}
