import { Column, Entity, OneToOne, JoinColumn, OneToMany, ManyToOne, Unique } from 'typeorm';
import DynamicEntity from './dynamicEntity';
import UserModel from './user';
import TournamentModel from './tournament';

@Entity({ name: 'teams' })
@Unique(['name', 'tournament'])
export default class TeamModel extends DynamicEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  lockedAt: Date;

  @OneToOne(() => UserModel, { nullable: false })
  @JoinColumn()
  captain: UserModel;

  @OneToMany(() => UserModel, (user) => user.team)
  users: UserModel[];

  @ManyToOne(() => TournamentModel, (tournament) => tournament.teams, { nullable: false })
  tournament: TournamentModel;
}
