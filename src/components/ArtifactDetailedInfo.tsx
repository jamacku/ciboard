/*
 * This file is part of ciboard

 * Copyright (c) 2021 Andrei Stepanov <astepano@redhat.com>
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import _ from 'lodash';
import * as React from 'react';
import moment from 'moment';
import { useQuery } from '@apollo/client';
import { useState } from 'react';
import {
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm,
    Flex,
    FlexItem,
    List,
    ListComponent,
    ListItem,
    OrderType,
    Spinner,
    Tab,
    TabTitleText,
    Tabs,
    Text,
    TextContent,
} from '@patternfly/react-core';

import styles from '../custom.module.css';
import { TabClickHandlerType } from '../types';
import { ArtifactsDetailedInfoKojiTask } from '../queries/Artifacts';
import { koji_instance, Artifact } from '../artifact';
import {
    mkCommitHashFromSource,
    mkLinkKojiWebBuildId,
    mkLinkKojiWebTagId,
    mkLinkKojiWebUserId,
    mkLinkPkgsDevelFromSource,
} from '../utils/artifactUtils';

/**
 * Different artifact types have different detailed info.
 */
interface ArtifactDetailedInfoKojiBuildProps {
    artifact: Artifact;
}
const ArtifactDetailedInfoKojiBuild: React.FC<
    ArtifactDetailedInfoKojiBuildProps
> = (props) => {
    const { artifact } = props;
    const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
    const handleTabClick: TabClickHandlerType = (_event, tabIndex) => {
        setActiveTabKey(tabIndex);
    };
    const instance = koji_instance(artifact.type);
    const { loading: loadingCurrentState, data: dataKojiTask } = useQuery(
        ArtifactsDetailedInfoKojiTask,
        {
            variables: {
                task_id: _.toNumber(artifact.aid),
                koji_instance: instance,
                distgit_instance: instance,
            },
            errorPolicy: 'all',
            notifyOnNetworkStatusChange: true,
        },
    );
    if (loadingCurrentState) {
        return (
            <>
                Loading build info
                <Spinner size="md" />
            </>
        );
    }
    const haveData =
        !loadingCurrentState &&
        dataKojiTask &&
        !_.isEmpty(dataKojiTask.koji_task?.builds);

    if (!haveData) {
        /** No additional info */
        return <></>;
    }
    const build = _.get(dataKojiTask, 'koji_task.builds.0');
    /** build time */
    const b_time = moment.unix(build.completion_ts).local();
    const build_time = b_time.format('YYYY-MM-DD, HH:mm');
    const build_zone_shift = b_time.format('ZZ');
    /** commit time */
    const c_time = moment
        .unix(build.commit_obj?.committer_date_seconds)
        .local();
    var commit_time = 'n/a';
    var commit_zone_shift = 'n/a';
    if (c_time.isValid()) {
        commit_time = c_time.format('YYYY-MM-DD, HH:mm');
        commit_zone_shift = c_time.format('ZZ');
    }
    const element = (
        <Tabs activeKey={activeTabKey} onSelect={handleTabClick}>
            <Tab eventKey={0} title={<TabTitleText>Build Info</TabTitleText>}>
                <DescriptionList
                    className="pf-u-px-lg pf-u-py-md"
                    columnModifier={{ default: '2Col' }}
                    isAutoColumnWidths
                    isCompact
                    isHorizontal
                >
                    <DescriptionListGroup>
                        <DescriptionListTerm>Build ID</DescriptionListTerm>
                        <DescriptionListDescription>
                            <a
                                href={mkLinkKojiWebBuildId(
                                    build.build_id,
                                    instance,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {build.build_id}
                            </a>
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>
                            Dist-git commit
                        </DescriptionListTerm>
                        <DescriptionListDescription>
                            <a
                                className={styles['buildInfoCommitHash']}
                                href={mkLinkPkgsDevelFromSource(
                                    build.source,
                                    instance,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {mkCommitHashFromSource(build.source)}
                            </a>
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>Build owner</DescriptionListTerm>
                        <DescriptionListDescription>
                            <a
                                href={mkLinkKojiWebUserId(
                                    build.owner_id,
                                    instance,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {build.owner_name}
                            </a>
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>Committer</DescriptionListTerm>
                        <DescriptionListDescription>
                            {build.commit_obj?.committer_name || 'n/a'}
                            &nbsp;&lt;
                            {build.commit_obj?.committer_email || 'n/a'}
                            &gt;
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>
                            Build completed
                        </DescriptionListTerm>
                        <DescriptionListDescription
                            className={styles['buildInfoTimestamp']}
                        >
                            {build_time} {build_zone_shift}
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>Commit time</DescriptionListTerm>
                        <DescriptionListDescription
                            className={styles['buildInfoTimestamp']}
                        >
                            {commit_time} {commit_zone_shift}
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                </DescriptionList>
            </Tab>
            <Tab
                eventKey={1}
                title={<TabTitleText>Active Koji Tags</TabTitleText>}
            >
                <Flex className="pf-u-p-md" flex={{ default: 'flexNone' }}>
                    <FlexItem
                        style={{
                            height: '10em',
                            overflow: 'auto',
                        }}
                    >
                        <List
                            component={ListComponent.ol}
                            type={OrderType.number}
                        >
                            {_.map(build.tags, (tag) => {
                                return (
                                    <ListItem key={tag.id}>
                                        <a
                                            href={mkLinkKojiWebTagId(
                                                tag.id,
                                                instance,
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {tag.name}
                                        </a>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </FlexItem>
                </Flex>
            </Tab>
            <Tab eventKey={2} title={<TabTitleText>Koji History</TabTitleText>}>
                <Flex className="pf-u-p-md" flex={{ default: 'flexNone' }}>
                    <FlexItem
                        style={{
                            height: '10em',
                            overflow: 'auto',
                        }}
                    >
                        <HistoryList history={build.history} />
                    </FlexItem>
                </Flex>
            </Tab>
        </Tabs>
    );
    return element;
};

/**
 * "tag_name": "rhel-8.5.0-candidate",
 * "active": null,
 * "creator_name": "jenkins/baseos-jenkins.rhev-ci-vms.eng.rdu2.redhat.com",
 * "create_ts": 1620283840.18954,
 * "creator_id": 2863,
 * "revoke_ts": 1621935173.47965,
 * "revoker_name": "astepano",
 * "revoker_id": 2951
 *
 * Create a list similar:
 *
 * brew list-history --build hostname-3.20-7.el8
 * Thu May  6 07:39:55 2021 hostname-3.20-7.el8 tagged into rhel-8.5.0-gate by pzhukov
 * Thu May  6 08:50:40 2021 hostname-3.20-7.el8 untagged from rhel-8.5.0-gate by jenkins/baseos-jenkins.rhev-ci-vms.eng.rdu2.redhat.com
 */
interface HistoryListProps {
    history: {
        tag_listing: KojiBuildTagType[];
    };
}

type TagActionHistoryType = {
    time: number;
    action: string;
    active: boolean;
    tag_name: string;
    person_id: number;
    person_name: string;
};

type KojiBuildTagType = {
    active: boolean;
    build_state: number;
    build_id: number;
    create_event: number;
    create_ts: number;
    creator_id: number;
    creator_name: string;
    epoch: string;
    name: string;
    release: string;
    revoke_event: string;
    revoke_ts: number;
    revoker_id: number;
    revoker_name: string;
    tag_name: string;
    tag_id: number;
};

const HistoryList: React.FC<HistoryListProps> = (props) => {
    const {
        history: { tag_listing },
    } = props;
    const lines: TagActionHistoryType[] = [];
    _.forEach(tag_listing, (e) => {
        lines.push({
            action: 'tagged into',
            active: e.active,
            time: e.create_ts,
            tag_name: e.tag_name,
            person_id: e.creator_id,
            person_name: e.creator_name,
        });
        if (_.every([e.revoke_ts, e.revoker_name, e.revoker_id])) {
            lines.push({
                action: 'untagged from',
                active: false,
                time: e.revoke_ts,
                tag_name: e.tag_name,
                person_id: e.revoker_id,
                person_name: e.revoker_name,
            });
        }
    });
    const log = _.orderBy(lines, ['time'], ['asc']);
    return (
        <List component={ListComponent.ol} type={OrderType.number}>
            {_.map(log, (entry) => {
                return (
                    <ListItem key={entry.action + entry.time}>
                        <HistoryListEntry entry={entry} />
                    </ListItem>
                );
            })}
        </List>
    );
};

interface HistoryListEntryProps {
    entry: TagActionHistoryType;
}
const HistoryListEntry: React.FC<HistoryListEntryProps> = (props) => {
    const {
        entry: { action, active, person_name, tag_name, time },
    } = props;
    const event_time = moment.unix(time).local();
    const local_time = event_time.format('YYYY-MM-DD, HH:mm');
    const shift = event_time.format('ZZ');
    const flag = active ? '[still active]' : '';
    return (
        <div style={{ whiteSpace: 'nowrap' }}>
            {local_time} {shift} {action} {tag_name} by {person_name} {flag}
        </div>
    );
};

interface ArtifactDetailedInfoProps {
    artifact: Artifact;
}

export function ArtifactDetailedInfo({ artifact }: ArtifactDetailedInfoProps) {
    if (['brew-build', 'koji-build', 'koji-build-cs'].includes(artifact.type)) {
        return (
            <>
                <ArtifactDetailedInfoKojiBuild
                    key={artifact.aid}
                    artifact={artifact}
                />
            </>
        );
    } else {
        return <></>;
    }
}
